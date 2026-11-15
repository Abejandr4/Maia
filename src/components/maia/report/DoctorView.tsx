import { useMemo, useState } from 'react';
import {
  REPORT_DAY,
  alerts as allAlerts,
  daily,
  evaluation,
  immune,
  labReal,
  reportSection,
  upTo,
  type DailyPoint,
} from '../../../data/maiaData';
import { INITIAL_SYMPTOMS, dateForDay } from '../../../utils/mockData';
import { shortDate, stamp } from '../../../utils/format';
import { useVitals } from '../../../utils/VitalsContext';
import type { Status } from '../../../utils/types';
import Card from '../../ui/Card';
import StatusPill from '../../ui/StatusPill';
import MaiaLineChart, { type RefLine } from '../MaiaLineChart';
import SourceTag from '../SourceTag';
import AlignedSignals from '../AlignedSignals';
import '../../report/report.css';
import '../maia.css';
import '../../../pages/pages.css';

/* ---------- shapes of the report sections (see analysis/code/step8_report.py) ---------- */
interface Header {
  crew_member: string;
  mission_day: number;
  report_period_days: number[];
  data_completeness_pct: number;
  disclaimer: string;
}
interface Change {
  type: 'marked_change' | 'immune_review';
  measurement: string;
  direction: string;
  level: string;
  first_day_outside: number;
  detected_day: number;
  last_day: number;
  days_outside_of_6?: number;
  size_vs_band_robust_sd: number | null;
  confidence: 'high' | 'medium' | 'low';
  note: string;
  domains_positive_max?: number;
  domains?: string[];
}
interface Ordered {
  changes: Change[];
  reference_limit_alerts: { measurement: string; red_days: number; days: number[]; rule?: string }[];
}
interface SeriesEvidence {
  measurement: string;
  unit: string;
  days: number[];
  values: (number | null)[];
  band: [number | null, number | null];
  reference: { green: [number | null, number | null]; red_below: number | null; red_above: number | null };
}
interface ImmuneEvidence {
  measurement: 'immune';
  blood_day: number;
  labs: { test: string; value: number; baseline: number; change_pct: number; rcv_pct: number | null; result_age_days: number }[];
  baseline_source: string;
  viral: string;
  clinical: string;
  inflammatory: string;
}
interface DataQuality {
  missing_days: Record<string, number[]>;
  stale_readings: Record<string, number[]>;
  learning_window: string;
}

const NAME: Record<string, string> = {
  heart_rate: 'Heart rate',
  bp_systolic: 'Blood pressure · top',
  bp_diastolic: 'Blood pressure · bottom',
  spo2: 'SpO₂',
  temperature: 'Body temperature',
  sleep: 'Sleep',
  'immune (4 domains)': 'Immune stress – review',
};
const UNIT: Record<string, string> = { heart_rate: 'bpm', bp_systolic: 'mmHg', bp_diastolic: 'mmHg', spo2: '%', temperature: '°C', sleep: 'h' };
const DIGITS: Record<string, number> = { heart_rate: 0, bp_systolic: 0, bp_diastolic: 0, spo2: 0, temperature: 1, sleep: 1 };
const LAB_NAME: Record<string, string> = { absolute_neutrophils: 'Neutrophils', absolute_lymphocytes: 'Lymphocytes', nlr: 'NLR (derived)' };
const SHORT: Record<string, string> = { heart_rate: 'Heart rate', bp_systolic: 'BP top', bp_diastolic: 'BP bottom', spo2: 'SpO₂', temperature: 'Temperature', sleep: 'Sleep' };
const SIGNALS = ['heart_rate', 'bp_systolic', 'bp_diastolic', 'spo2', 'temperature', 'sleep'] as const;
const LEVEL_STATUS: Record<string, Status> = { advisory: 'advisory', caution: 'caution', warning: 'warning', critical: 'critical' };
const EVENT_LABEL: Record<string, string> = { solar_event: 'Solar S2', schedule_shift: 'Schedule shift', eva: 'EVA', co2_peak: 'CO₂ peak' };

const refLinesFor = (m: string): RefLine[] => {
  const r = daily.reference[m];
  if (!r) return [];
  const out: RefLine[] = [];
  if (r.red_above != null) out.push({ value: r.red_above, label: `red ${r.red_above}`, tone: 'red' });
  if (r.red_below != null) out.push({ value: r.red_below, label: `red ${r.red_below}`, tone: 'red' });
  if (r.green_max != null && r.green_max !== r.red_above) out.push({ value: r.green_max, label: `ref ${r.green_max}`, tone: 'green' });
  if (r.green_min != null && r.green_min !== r.red_below) out.push({ value: r.green_min, label: `ref ${r.green_min}`, tone: 'green' });
  return out;
};

/** Days on or before the report day with a value outside the personal band. */
const outsideDays = (m: string) =>
  upTo(daily.series[m] ?? []).filter((p) => p.side === 'high' || p.side === 'low').map((p) => p.day);

/* static data of the demo (does not change while the page is open) */
const events = upTo(daily.events.filter((e) => e.kind === 'event'));
const chartEvents = events.map((e) => ({ day: e.day, label: EVENT_LABEL[e.id] ?? e.id }));
const analysisSymptoms = upTo(daily.events.filter((e) => e.kind === 'symptom'));
const alerts = upTo(allAlerts);

export default function DoctorView({ note, sizeKb, sent, onBack }: { note: string; sizeKb: number; sent: boolean; onBack: () => void }) {
  const { symptoms } = useVitals();
  const [reply, setReply] = useState('');
  const [replied, setReplied] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const header = reportSection<Header>('Header');
  const ordered = reportSection<Ordered>('Ordered changes');
  const evidence = reportSection<(SeriesEvidence | ImmuneEvidence)[]>('Evidence') ?? [];
  const dq = reportSection<DataQuality>('Data quality');
  const overlap = reportSection<{ change: string; event: string; day: number }[]>('Overlapping events') ?? [];
  const changes = ordered?.changes ?? [];

  const initialIds = useMemo(() => new Set(INITIAL_SYMPTOMS.map((s) => s.id)), []);
  const loggedNow = symptoms.filter((s) => !initialIds.has(s.id));

  /* immune */
  const window14 = immune.timeline.filter((d) => d.day > REPORT_DAY - 14 && d.day <= REPORT_DAY);
  const todayImmune = immune.timeline.find((d) => d.day === REPORT_DAY);
  const firstReview = immune.timeline.find((d) => d.immune_review !== '' && d.day <= REPORT_DAY);

  /* daily log rows */
  const rows = useMemo(() => {
    const at = (m: string, day: number): DailyPoint | undefined => daily.series[m]?.find((p) => p.day === day);
    const co2 = new Map(daily.cabin_co2.map((c) => [c.day, c]));
    const rad = new Map(daily.radiation_pct_of_career_limit.map((r) => [r.day, r.value]));
    return Array.from({ length: REPORT_DAY }, (_, i) => REPORT_DAY - i).map((day) => {
      const cells = Object.fromEntries(SIGNALS.map((m) => [m, at(m, day)])) as Record<string, DailyPoint | undefined>;
      const flagged = SIGNALS.some((m) => {
        const p = cells[m];
        return p && (p.side === 'high' || p.side === 'low' || p.ref_status === 'red' || p.marked_change !== '');
      });
      const prev = rad.get(day - 1);
      const doseDay = prev != null && rad.get(day) != null ? ((rad.get(day)! - prev) / 100) * 600 : null;
      const ev = events.filter((e) => e.day === day).map((e) => EVENT_LABEL[e.id] ?? e.id);
      const sx = analysisSymptoms.filter((s) => s.day === day).map((s) => s.id);
      return { day, cells, co2: co2.get(day)?.mean ?? null, doseDay, ev, sx, flagged };
    });
  }, []);
  const visibleRows = rows.filter((r) => !onlyFlagged || r.flagged || r.ev.length || r.sx.length);
  const shownRows = showAll ? visibleRows : visibleRows.slice(0, 14);
  const cellClass = (p?: DailyPoint) =>
    !p || p.value == null ? 'num maia-cell-missing' : p.side === 'high' || p.side === 'low' || p.ref_status === 'red' ? 'num is-flag' : 'num';
  const cellText = (p: DailyPoint | undefined, m: string) => (!p || p.value == null ? '—' : p.value.toFixed(DIGITS[m]));

  /* real-data findings */
  const glucose = labReal.data_quality.find((q) => q.test_id === 'glucose');
  const crewIds = Object.keys(labReal.crew);
  const aboveAtR1 = (t: string) =>
    crewIds.filter((c) => labReal.crew[c][t]?.post.find((p) => p.timepoint === 'R+1')?.status === 'above pre-flight range').length;
  const evalRows = evaluation.filter((r) => r.section.startsWith('A') || r.section.startsWith('B') || r.section.startsWith('C'));
  const analytic = evaluation.filter((r) => r.section.startsWith('D'));

  const sleepRed = ordered?.reference_limit_alerts.find((a) => a.measurement === 'sleep');

  return (
    <div className="maia-doctor">
      {/* console bar */}
      <div className="maia-console">
        <div>
          <p className="maia-console__title">On Earth · flight surgeon</p>
          <p className="muted small">Maia console · read-only · {header?.crew_member} · D{header?.report_period_days[0] ?? 1}–D{REPORT_DAY}</p>
        </div>
        <StatusPill status={sent ? 'normal' : 'advisory'} label={sent ? 'Packet queued' : 'Preview · not sent yet'} size="sm" />
        <span className="mono small muted maia-console__meta">
          MA-{REPORT_DAY} · {sizeKb.toFixed(1)} KB · completeness {header?.data_completeness_pct}%
        </span>
        <button type="button" className="btn btn--sm" onClick={onBack}>
          ← Back to astronaut
        </button>
      </div>

      <div className="maia-doc-grid">
        {/* left column */}
        <div className="maia-doc-grid__left">
          <Card title="Ranked changes" aside={<span className="muted small">severity → confidence → size</span>}>
            {changes.length === 0 && <p className="muted">No marked change.</p>}
            {changes.map((c, i) => {
              const isImmune = c.type === 'immune_review';
              const n = isImmune ? c.domains_positive_max ?? 0 : c.days_outside_of_6 ?? 0;
              const of = isImmune ? 4 : 6;
              const ev = overlap.filter((o) => o.change === c.measurement).map((o) => `${EVENT_LABEL[o.event] ?? o.event} D${o.day}`);
              return (
                <div key={c.measurement} className="maia-rc">
                  <div className="maia-rc__head">
                    <span className="maia-change__rank">{i + 1}</span>
                    <b>
                      {NAME[c.measurement] ?? c.measurement}
                      {c.direction ? ` · ${c.direction}` : ''}
                    </b>
                    <StatusPill status={LEVEL_STATUS[c.level] ?? 'caution'} size="sm" />
                  </div>
                  <p className="small">
                    {isImmune
                      ? `${c.domains?.join(' + ')} · since D${c.first_day_outside}`
                      : `${n} of 6 days outside personal band · days ${c.first_day_outside}–${c.last_day} · ${c.size_vs_band_robust_sd}× robust SD`}
                  </p>
                  <div className="maia-rc__bar">
                    <div style={{ width: `${(n / of) * 100}%` }} />
                  </div>
                  <p className="maia-rc__meta">
                    {n}/{of} {isImmune ? 'domains' : 'days'} · confidence <span className={`maia-conf maia-conf--${c.confidence}`}>{c.confidence}</span>
                    {ev.length ? ` · events: ${ev.join(', ')}` : ''}
                  </p>
                </div>
              );
            })}
          </Card>

          <Card title="Astronaut note" aside={<span className="muted small">exactly as written</span>}>
            <p className={note ? 'maia-quote' : 'muted'}>{note || 'No note written yet.'}</p>
          </Card>

          <Card title="Packet contents">
            <ul className="maia-sent">
              <li>
                {Object.keys(daily.bands).length} signals vs personal band ·{' '}
                {Object.keys(daily.bands).reduce((k, m) => k + upTo(daily.series[m] ?? []).filter((p) => p.value != null).length, 0)} readings
              </li>
              <li>
                {analysisSymptoms.length + loggedNow.length} symptom logs · {loggedNow.flatMap((s) => s.photos ?? []).length} photos · {events.length}{' '}
                mission events
              </li>
              <li>
                Missing:{' '}
                {Object.entries(dq?.missing_days ?? {})
                  .map(([m, d]) => `${NAME[m] ?? m} D${d[0]}–D${d[d.length - 1]}`)
                  .join('; ') || 'none'}
                · stale: {Object.keys(dq?.stale_readings ?? {}).length || 'none'}
              </li>
              <li>{alerts.length} alerts · lab results vs pre-flight baseline and RCV</li>
              <li>No mood or family data included</li>
            </ul>
          </Card>
        </div>

        {/* right column */}
        <div className="maia-doc-grid__right">
          <Card
            title={<span>All signals · days 1–{REPORT_DAY} · personal bands and general references</span>}
            aside={
              <div className="maia-legend">
                <span><i style={{ background: 'var(--normal)', opacity: 0.25 }} />personal band</span>
                <span><i style={{ borderTop: '1px dashed var(--normal)', height: 0 }} />general ref</span>
                <span><i style={{ background: 'var(--caution)', opacity: 0.3 }} />marked change</span>
              </div>
            }
          >
            <AlignedSignals
              toDay={REPORT_DAY}
              events={chartEvents}
              symptomDays={[...analysisSymptoms.map((s) => s.day)]}
              rows={SIGNALS.map((m) => {
                const r = daily.reference[m];
                return {
                  key: m,
                  label: SHORT[m] ?? m,
                  unit: UNIT[m],
                  digits: DIGITS[m],
                  points: upTo(daily.series[m] ?? []).map((p) => ({ day: p.day, value: p.value, side: p.side })),
                  band: daily.bands[m],
                  refs: [r?.green_min, r?.green_max].filter((v): v is number => v != null),
                  episodes: daily.changes
                    .filter((c) => c.measurement_id === m && c.detection_day <= REPORT_DAY)
                    .map((c) => ({ from: c.first_out_day, to: Math.min(c.last_day, REPORT_DAY) })),
                };
              })}
            />
            <div className="maia-tags" style={{ marginTop: 6 }}>
              <SourceTag kind="sample" />
              <SourceTag kind="cited" ids="S27; S28; S32; S42; S56; S57" label="REFS · METHOD" />
            </div>
          </Card>

          <Card title="Data quality" aside={<span className="muted small">missing days never count as normal</span>}>
            <div className="maia-dq" aria-label="Data quality per day">
              {Array.from({ length: REPORT_DAY }, (_, i) => i + 1).map((d) => {
                const miss = Object.values(dq?.missing_days ?? {}).some((arr) => arr.includes(d));
                const change = SIGNALS.some((m) => daily.series[m]?.find((p) => p.day === d)?.marked_change);
                const kind = miss ? 'missing' : change ? 'change' : d <= 7 ? 'adapt' : d <= 21 ? 'learn' : 'ok';
                return <div key={d} className={`maia-dq__cell maia-dq__cell--${kind}`} title={`D${d}: ${kind}`} />;
              })}
            </div>
            <div className="maia-legend">
              <span><i style={{ background: 'var(--surface-3)' }} />D1–7 adaptation (skipped)</span>
              <span><i style={{ background: 'var(--advisory-soft)' }} />D8–21 learning window</span>
              <span><i style={{ border: '1px dashed var(--text-3)' }} />missing</span>
              <span><i style={{ background: 'var(--caution-soft)' }} />marked change</span>
            </div>
            {sleepRed && (
              <p className="maia-note">
                Threshold under review: sleep is below the 6 h red limit on {sleepRed.red_days} of {REPORT_DAY} days, while the ISS average is 6–6.5 h.{' '}
                <SourceTag kind="unverified" label="REVIEW LIMIT" />
              </p>
            )}
          </Card>

          {evidence.map((ev, i) => {
            const c = changes[i];
            if (!c) return null;
            if (ev.measurement !== 'immune') {
              const se = ev as SeriesEvidence;
              return (
                <Card key={ev.measurement} title={`Evidence · ${NAME[ev.measurement] ?? ev.measurement} · last 7 days`}>
                  <MaiaLineChart
                    points={se.days.map((d, k) => ({ day: d, value: se.values[k] }))}
                    band={{ low: se.band[0], high: se.band[1] }}
                    refLines={refLinesFor(ev.measurement)}
                    events={chartEvents.filter((e) => se.days.includes(e.day))}
                    markDays={outsideDays(ev.measurement).filter((d) => se.days.includes(d))}
                    unit={se.unit}
                    digits={DIGITS[ev.measurement] ?? 1}
                    height={200}
                  />
                </Card>
              );
            }
            const ie = ev as ImmuneEvidence;
            return (
              <Card key="immune" title={`Evidence · immune review · ${todayImmune?.n_domains ?? 0} of 4 domains`}>
                <div className="maia-domains">
                  {(['cellular', 'inflammatory', 'viral', 'clinical'] as const).map((d) => {
                    const state = todayImmune?.[d] ?? 'negative';
                    const text = d === 'cellular' ? `Blood D${ie.blood_day}` : d === 'viral' ? ie.viral : d === 'clinical' ? ie.clinical : ie.inflammatory;
                    return (
                      <div key={d} className={`maia-domain maia-domain--${state === 'positive' ? 'positive' : 'other'}`}>
                        <p className="maia-domain__name">{d}</p>
                        <p className="maia-domain__state">{state}</p>
                        <p className="maia-domain__ev">{text}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="table-wrap">
                  <table className="data-table" style={{ marginTop: 12 }}>
                    <thead>
                      <tr>
                        <th>Blood test D{ie.blood_day}</th>
                        <th className="num">Baseline (REAL)</th>
                        <th className="num">Value (SAMPLE)</th>
                        <th className="num">Change</th>
                        <th className="num">RCV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ie.labs.map((l) => (
                        <tr key={l.test}>
                          <td className="is-sans">{LAB_NAME[l.test] ?? l.test}</td>
                          <td className="num">{l.baseline}</td>
                          <td className="num">{l.value}</td>
                          <td className={l.rcv_pct != null && Math.abs(l.change_pct) > l.rcv_pct ? 'num is-flag' : 'num'}>
                            {l.change_pct > 0 ? '+' : ''}
                            {l.change_pct}%
                          </td>
                          <td className="num">{l.rcv_pct != null ? `${l.rcv_pct}%` : 'no RCV'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="maia-window" aria-label="Domains per day, last 14 days">
                  {window14.map((d) => (
                    <div key={d.day}>
                      <div className="maia-window__bar" title={`D${d.day}: ${d.n_domains} domains`}>
                        <div
                          className={`maia-window__fill ${d.immune_review ? 'maia-window__fill--review' : ''}`}
                          style={{ height: `${(d.n_domains / 4) * 100}%` }}
                        />
                      </div>
                      <p className="maia-window__day">{d.day}</p>
                    </div>
                  ))}
                </div>
                <p className="maia-note">
                  Baseline: {ie.baseline_source}. Rule: ≥ 2 domains within 14 days (DEMO, not clinical). Review raised D{firstReview?.day}. Context (never
                  triggers alone): {todayImmune?.context.replace(/solar_event/g, 'solar event').replace(/\beva\b/g, 'EVA') || 'none'}.
                </p>
              </Card>
            );
          })}

          <Card title="Reply to the crew">
            <textarea
              className="maia-textarea"
              placeholder="Acknowledge, ask for a re-check, or book a private link…"
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                setReplied(false);
              }}
            />
            <div className="maia-send">
              <button type="button" className="btn btn--primary" disabled={!reply || replied} onClick={() => setReplied(true)}>
                {replied ? 'Queued ✓' : 'Send to crew'}
              </button>
              <span className="muted small">Replies are delivered with the next comm window.</span>
            </div>
          </Card>
        </div>
      </div>

      {/* daily log */}
      <details className="maia-section maia-details">
        <summary>
          <h2>Daily log</h2>
          <span className="eyebrow">Every signal · every mission day · tap to open</span>
        </summary>
        <Card>
          <div className="daily__controls">
            <label className="toggle">
              <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
              <span>Only days with flags, events or symptoms</span>
            </label>
            <span className="muted small">Highlighted = outside your personal band or in the red reference range. — = missing.</span>
          </div>
          <div className="table-wrap daily__wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th className="num">BP</th>
                  <th className="num">HR</th>
                  <th className="num">SpO₂</th>
                  <th className="num">Temp</th>
                  <th className="num">Sleep</th>
                  <th className="num">CO₂</th>
                  <th className="num">Dose</th>
                  <th>Events · symptoms</th>
                </tr>
              </thead>
              <tbody>
                {shownRows.map((r) => (
                  <tr key={r.day}>
                    <td>D{r.day}</td>
                    <td className="is-sans">{shortDate(dateForDay(r.day))}</td>
                    <td className={cellClass(r.cells.bp_systolic?.side ? r.cells.bp_systolic : r.cells.bp_diastolic)}>
                      {cellText(r.cells.bp_systolic, 'bp_systolic')}/{cellText(r.cells.bp_diastolic, 'bp_diastolic')}
                    </td>
                    <td className={cellClass(r.cells.heart_rate)}>{cellText(r.cells.heart_rate, 'heart_rate')}</td>
                    <td className={cellClass(r.cells.spo2)}>{cellText(r.cells.spo2, 'spo2')}</td>
                    <td className={cellClass(r.cells.temperature)}>{cellText(r.cells.temperature, 'temperature')}</td>
                    <td className={cellClass(r.cells.sleep)}>{cellText(r.cells.sleep, 'sleep')}</td>
                    <td className="num">{r.co2 != null ? r.co2.toFixed(2) : '—'}</td>
                    <td className="num">{r.doseDay != null ? r.doseDay.toFixed(2) : '—'}</td>
                    <td className="is-sans">
                      <div className="maia-tags">
                        {r.ev.map((e) => (
                          <span key={e} className="daily__event">
                            {e}
                          </span>
                        ))}
                        {r.sx.map((s) => (
                          <span key={s} className="sev sev--mild">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleRows.length > 14 && (
            <button type="button" className="link-btn daily__more" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show last 14 days' : `Show all ${visibleRows.length} days`}
            </button>
          )}
          <div className="maia-tags" style={{ marginTop: 10 }}>
            <SourceTag kind="sample" label="SAMPLE · generator of guide §6, AR(1) φ = 0.5" />
          </div>
        </Card>
      </details>

      {/* 5 + 6 · symptoms and alerts */}
      <div className="report-2col report-2col--logs">
        <Card
          className="log-card"
          title={<span className="log-card__title">Symptoms and photos</span>}
          aside={<span className="muted small">as logged by the astronaut</span>}
        >
          <ul className="log-list">
            {loggedNow.map((s) => (
              <li key={s.id} className="log-item">
                <div className="log-item__main">
                  <p className="log-item__title">{s.name}</p>
                  {s.note && <p className="log-item__note">{s.note}</p>}
                  <p className="log-item__time">{stamp(s.time)} · logged now</p>
                  {s.photos && s.photos.length > 0 && (
                    <div className="maia-photos">
                      {s.photos.map((p) => (
                        <img key={p.takenAt} src={p.dataUrl} alt={p.caption ?? p.bodyLocation ?? 'symptom photo'} />
                      ))}
                    </div>
                  )}
                </div>
                <span className={`sev sev--${s.severity}`}>{s.severity}</span>
              </li>
            ))}
            {[...analysisSymptoms].reverse().map((s) => (
              <li key={`${s.day}${s.id}`} className="log-item">
                <div className="log-item__main">
                  <p className="log-item__title">{s.id === 'rash' ? 'Rash (photo)' : s.id}</p>
                  <p className="log-item__note">{s.description}</p>
                  <p className="log-item__time">D{s.day} · {shortDate(dateForDay(s.day))}</p>
                </div>
                <div style={{ alignSelf: 'flex-start' }}>
                  <SourceTag kind="sample" />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="log-card" title={<span className="log-card__title">Alert record</span>} aside={<span className="muted small">from the analysis</span>}>
          <ul className="log-list">
            {alerts.map((a) => (
              <li key={`${a.day}${a.alert_id}${a.measurement}`} className="log-item">
                <div className="log-item__main">
                  <p className="log-item__title">{a.title}</p>
                  <p className="log-item__note">{a.text}</p>
                  <p className="log-item__time">D{a.day} · {shortDate(dateForDay(a.day))} · {a.source}</p>
                </div>
                <div className="log-item__side">
                  <span className={`level level--${a.level}`}>{a.level}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* why you can trust this */}
      <section className="maia-section">
        <div className="maia-section__head">
          <h2>Why you can trust this</h2>
          <span className="eyebrow">Real NASA data · tested method</span>
        </div>
        <div className="maia-stack">
          <Card title="Tested on real NASA data" aside={<SourceTag kind="real" ids="S78; S79" />}>
            <div className="maia-finding">
              <div className="maia-finding__head">
                <span className="maia-finding__title">Glucose {glucose?.timepoint}: sample handling, not an alarm</span>
              </div>
              <p>
                {glucose?.crew_outside} of {glucose?.crew_total} crew below the lab range at {glucose?.timepoint}, all back in range by{' '}
                {glucose?.next_timepoint}. Maia says “{glucose?.message}”.
              </p>
            </div>
            <div className="maia-finding">
              <div className="maia-finding__head">
                <span className="maia-finding__title">Inflammation after landing</span>
              </div>
              <p>
                IL-6 above the person’s own pre-flight range at R+1 in {aboveAtR1('il_6')} of {crewIds.length} crew; CCL2 in{' '}
                {aboveAtR1('mcp_1')} of {crewIds.length}. Consistent with the SOMA atlas (2024).
              </p>
            </div>
            {labReal.immune_rule_on_real_data.map((r) => (
              <div key={r.crew_id + r.timepoint} className="maia-finding">
                <div className="maia-finding__head">
                  <span className="maia-finding__title">
                    {r.crew_id} at {r.timepoint}: 2 immune domains
                  </span>
                </div>
                <p>
                  Cellular ({r.cellular.replace('absolute_', '')} beyond RCV) + inflammatory ({r.inflammatory.replace('mcp_1', 'CCL2').replace('il_6', 'IL-6')}).
                  The immune rule would ask for a review.
                </p>
              </div>
            ))}
            <p className="maia-note">{labReal.caveat}.</p>
          </Card>

          <Card title="How well the method works" aside={<SourceTag kind="cited" label="OUR CALCULATION" />}>
            <div className="table-wrap">
            <table className="data-table maia-eval">
              <thead>
                <tr>
                  <th>Test ({evaluation[0]?.runs ?? 0} simulated missions)</th>
                  <th className="num">Detected</th>
                  <th className="num">False alarms /100 crew-days</th>
                  <th className="num">Days to detect</th>
                </tr>
              </thead>
              <tbody>
                {evalRows.map((r) => (
                  <tr key={r.item}>
                    <td className="is-sans">{r.item}</td>
                    <td className="num">{r.detection_rate_pct != null ? `${r.detection_rate_pct}%` : '–'}</td>
                    <td className="num">{r.false_alarms_per_100_crew_days ?? '–'}</td>
                    <td className="num">
                      {r.days_to_detection_median == null ? '–' : r.note?.includes('flight day 1') ? `by D${r.days_to_detection_median}` : r.days_to_detection_median}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="maia-note">
              Guide estimate (known band, independent days): {analytic.map((r) => `${r.item.replace('Detection in one 6-day window, ', '')}: ${r.detection_rate_pct ?? r.note}`).join(' · ')}.
              With a band learned on 14 days and day-to-day correlation, false alarms are higher — shown honestly.
            </p>
          </Card>
        </div>

        <Card title="How Maia decides" className="maia-section">
          <ul className="maia-list">
            <li>
              <b>Your band</b> is learned on flight days 8–21 (days 1–7 skipped for space adaptation): median ± 2.5 × robust SD (MAD × 1.4826).
            </li>
            <li>
              <b>A marked change</b> needs ≥ 4 of the last 6 days outside the band on the same side. One bad reading never triggers it.
            </li>
            <li>
              <b>Lab tests</b> are compared with the mean of your own pre-flight results; a change counts only if it is larger than the reference
              change value (RCV).
            </li>
            <li>
              <b>Immune review</b> needs 2 or more domains (cellular, inflammatory, viral, clinical) within 14 days. Context adds weight but never
              triggers it alone.
            </li>
            <li>
              <b>Events</b> within ±1 day are shown beside a change. They never change the band.
            </li>
          </ul>
          <div className="maia-tags" style={{ marginTop: 12 }}>
            <SourceTag kind="cited" ids="S56; S57; S77; S88; S89; S83" label="SOURCES" />
          </div>
          <p className="maia-note">Report for mission day {header?.mission_day ?? REPORT_DAY} · {header?.crew_member} · {header?.disclaimer}.</p>
        </Card>
      </section>
    </div>
  );
}
