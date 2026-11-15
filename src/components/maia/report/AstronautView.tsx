import { useMemo } from 'react';
import { REPORT_DAY, daily, immune, measurementTexts, pastReports, report, reportSection, upTo } from '../../../data/maiaData';
import { INITIAL_SYMPTOMS, dateForDay } from '../../../utils/mockData';
import { shortDate, stamp } from '../../../utils/format';
import { useVitals } from '../../../utils/VitalsContext';
import Card from '../../ui/Card';
import StatusPill from '../../ui/StatusPill';
import SourceTag from '../SourceTag';
import '../../report/report.css';
import '../maia.css';

/*
 * Astronaut side of Reports (mockup: "Maia health report" letter + next downlink + past reports).
 * Plain words; every number comes from the analysis JSON; "what to do" texts come from measurements.csv.
 */

interface Change {
  type: 'marked_change' | 'immune_review';
  measurement: string;
  direction: string;
  first_day_outside: number;
  detected_day: number;
  days_outside_of_6?: number;
  confidence: string;
}

const PLAIN: Record<string, string> = {
  heart_rate: 'Resting heart rate',
  bp_systolic: 'Blood pressure (top number)',
  bp_diastolic: 'Blood pressure (bottom number)',
  spo2: 'Blood oxygen',
  temperature: 'Body temperature',
  sleep: 'Sleep',
};
const UNIT: Record<string, string> = { heart_rate: 'bpm', bp_systolic: 'mmHg', bp_diastolic: 'mmHg', spo2: '%', temperature: '°C', sleep: 'h' };
const DIG: Record<string, number> = { heart_rate: 0, bp_systolic: 0, bp_diastolic: 0, spo2: 0, temperature: 1, sleep: 1 };
const EVENT_PLAIN: Record<string, string> = {
  solar_event: 'the solar storm',
  schedule_shift: 'your schedule changed',
  eva: 'your spacewalk',
  co2_peak: 'cabin CO₂ was high',
};
const SECTION_PLAIN: Record<string, string> = {
  Header: 'Day, location and how complete your data are',
  'Ordered changes': 'What changed, ranked by importance',
  Evidence: 'The values behind each change, against your personal band',
  'Data quality': 'Missing days and old readings',
  'Overlapping events': 'Events that may explain a change',
  Symptoms: 'Your symptoms and photos',
  'Incident timeline': 'Emergency timeline, if one happened',
  'Astronaut note': 'Your note, exactly as written',
};

interface Props {
  note: string;
  setNote: (v: string) => void;
  sent: boolean;
  onSend: () => void;
  sizeKb: number;
  onLogSymptom: () => void;
  onShowDoctor: () => void;
}

export default function AstronautView({ note, setNote, sent, onSend, sizeKb, onLogSymptom, onShowDoctor }: Props) {
  const { symptoms } = useVitals();
  const changes = reportSection<{ changes: Change[] }>('Ordered changes')?.changes ?? [];
  const dq = reportSection<{ missing_days: Record<string, number[]> }>('Data quality');
  const initialIds = useMemo(() => new Set(INITIAL_SYMPTOMS.map((s) => s.id)), []);
  const loggedNow = symptoms.filter((s) => !initialIds.has(s.id));
  const analysisSymptoms = upTo(daily.events.filter((e) => e.kind === 'symptom'));
  const photos = loggedNow.flatMap((s) => s.photos ?? []);

  /* counters of the letter */
  const SIGNALS = Object.keys(daily.bands);
  const readings = SIGNALS.reduce((n, m) => n + upTo(daily.series[m] ?? []).filter((p) => p.value != null).length, 0);
  const missingDays = new Set(Object.values(dq?.missing_days ?? {}).flat());

  /* immune facts */
  const saliva = immune.saliva.find((s) => s.result === 'positive' && s.day <= REPORT_DAY);
  const blood = immune.inflight_labs.filter((l) => l.day <= REPORT_DAY);
  const rash = analysisSymptoms.find((s) => s.id === 'rash');

  return (
    <div className="maia-reports">
      <div className="maia-reports__main">
        {/* the letter */}
        <Card className="maia-letter">
          <header className="maia-letter__head">
            <div>
              <p className="eyebrow">Maia health report</p>
              <h2 className="maia-letter__title">Day {REPORT_DAY}</h2>
            </div>
            <div className="maia-letter__to">
              <p>To: your flight surgeon</p>
              <p className="muted">with the next downlink</p>
              <p>
                <b>Not a diagnosis</b>
              </p>
            </div>
          </header>

          <p className="eyebrow maia-letter__label">What changed</p>
          {changes.length === 0 && <p className="muted">Nothing outside your normal. Keep measuring every morning.</p>}
          <ol className="maia-ranked">
            {changes.map((c, i) => {
              const isImmune = c.type === 'immune_review';
              const band = daily.bands[c.measurement];
              const near = isImmune
                ? []
                : upTo(daily.events.filter((e) => e.kind === 'event' && e.day >= c.first_day_outside - 1 && e.day <= c.detected_day + 1));
              const todo = isImmune ? null : measurementTexts[c.measurement]?.what_to_do_yellow;
              return (
                <li key={c.measurement} className="maia-ranked__item">
                  <span className="maia-change__rank">{i + 1}</span>
                  <div className="maia-ranked__body">
                    <p className="maia-ranked__title">
                      {isImmune
                        ? 'Immune system: signs to review'
                        : `${PLAIN[c.measurement] ?? c.measurement} ${c.direction === 'low' ? 'lower' : 'higher'} than usual`}
                    </p>
                    <p className="maia-ranked__sub">
                      {isImmune
                        ? [
                            saliva && `saliva test positive for ${saliva.virus} (day ${saliva.day})`,
                            blood.length > 0 &&
                              `blood test with more neutrophils and fewer lymphocytes than your pre-flight values (day ${blood[0].day})`,
                            rash && `rash photo (day ${rash.day})`,
                          ]
                            .filter(Boolean)
                            .join(', ')
                            .replace(/^./, (ch) => ch.toUpperCase()) + ' — all within two weeks.'
                        : `${c.days_outside_of_6} of the last 6 days ${c.direction === 'low' ? 'below' : 'above'} your normal (${band.low?.toFixed(DIG[c.measurement])}–${band.high?.toFixed(DIG[c.measurement])} ${UNIT[c.measurement]}), since day ${c.first_day_outside}${near.length ? ` — when ${near.map((e) => EVENT_PLAIN[e.id] ?? e.description).join(' and ')}` : ''}.`}
                    </p>
                    <p className="maia-ranked__todo">
                      <b>{isImmune ? 'What happens now: ' : 'What to do: '}</b>
                      {isImmune ? 'your flight surgeon will review it with you.' : todo}
                    </p>
                  </div>
                  <StatusPill status="caution" label={isImmune ? 'Review' : 'Caution'} size="sm" />
                </li>
              );
            })}
          </ol>

          <div className="maia-counters">
            <div>
              <p className="maia-counters__n">{SIGNALS.length}</p>
              <p className="maia-counters__l">signals compared with your normal</p>
            </div>
            <div>
              <p className="maia-counters__n">{readings}</p>
              <p className="maia-counters__l">readings</p>
            </div>
            <div>
              <p className="maia-counters__n">{analysisSymptoms.length + loggedNow.length}</p>
              <p className="maia-counters__l">symptoms{photos.length ? ` · ${photos.length} photos` : ''}</p>
            </div>
            <div>
              <p className="maia-counters__n">{missingDays.size}</p>
              <p className="maia-counters__l">days with missing data</p>
            </div>
          </div>

          <div className="maia-letter__log">
            <div className="maia-letter__loghead">
              <p className="eyebrow">Your symptoms and photos</p>
              <button type="button" className="link-btn" onClick={onLogSymptom}>
                + Add
              </button>
            </div>
            <ul className="maia-loglist">
              {loggedNow.map((s) => (
                <li key={s.id}>
                  <span>
                    <b>{s.name}</b> · {s.severity} · {stamp(s.time)}
                    {s.note ? ` — ${s.note}` : ''}
                  </span>
                  {s.photos && s.photos.length > 0 && (
                    <div className="maia-photos">
                      {s.photos.map((ph) => (
                        <img key={ph.takenAt} src={ph.dataUrl} alt={ph.caption ?? ph.bodyLocation ?? 'symptom photo'} />
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {[...analysisSymptoms].reverse().map((s) => (
                <li key={s.day + s.id}>
                  <span>
                    <b>{s.id === 'rash' ? 'Skin rash (photo)' : s.id}</b> · day {s.day} · {shortDate(dateForDay(s.day))}
                  </span>
                  <SourceTag kind="sample" />
                </li>
              ))}
            </ul>
          </div>

          <p className="eyebrow maia-letter__label">Your note</p>
          <textarea
            className="maia-textarea"
            placeholder="How do you feel? Anything your flight surgeon should know…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <footer className="maia-letter__foot">
            <span>Generated by Maia · your band from days 8–21 · a change needs 4 of 6 days · labs vs your pre-flight values</span>
            <span className="mono">
              Packet MA-{REPORT_DAY} · {sizeKb.toFixed(1)} KB
            </span>
          </footer>
        </Card>

        {/* past reports */}
        <p className="eyebrow maia-past__label">Past reports</p>
        <Card className="maia-past">
          <ul>
            {pastReports.map((p) => (
              <li key={p.day}>
                <span className="mono">D{p.day}</span>
                <span className="maia-past__title">{p.headline}</span>
                <span className="mono muted small">
                  {shortDate(dateForDay(p.day))} · {p.size_kb.toFixed(1)} KB
                </span>
                <StatusPill status="normal" label="Sent" size="sm" />
              </li>
            ))}
          </ul>
          <p className="maia-note">Same method, run on earlier days. Sample data.</p>
        </Card>
      </div>

      {/* right column */}
      <aside className="maia-reports__side">
        <Card className="maia-downlink">
          <p className="eyebrow">Next downlink</p>
          <p className="maia-downlink__big">{sent ? 'Queued' : 'Ready'}</p>
          <p className="muted small">
            Packet {sizeKb.toFixed(1)} KB · {daily.comm_policy}
          </p>
          <button type="button" className="btn btn--primary maia-downlink__btn" onClick={onSend} disabled={sent}>
            {sent ? 'Queued ✓' : 'Send with next downlink'}
          </button>
          <p className="muted small">Stored on this device until Earth confirms it arrived. If the link drops, the packet waits and retries.</p>
        </Card>

        <button type="button" className="card maia-preview" onClick={onShowDoctor}>
          <span>
            <b>Preview what your doctor sees</b>
            <br />
            <span className="muted small">Flight surgeon view · read-only</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>

        <Card title="What is sent">
          <ul className="maia-sent">
            {report.sections
              .filter((s) => SECTION_PLAIN[s.section])
              .map((s) => (
                <li key={s.section}>{SECTION_PLAIN[s.section]}</li>
              ))}
          </ul>
          <p className="muted small">Mood data are never included.</p>
        </Card>
      </aside>
    </div>
  );
}
