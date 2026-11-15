import { useMemo, useState } from 'react';
import type { Metric } from '../utils/types';
import { PERSONAL_NORMAL, STATUS_RANK, evaluateSample, roundSample, worstStatus } from '../utils/baselines';
import { EVENTS, MISSION_DAYS, TODAY_DAY, WEEK_SAMPLES } from '../utils/mockData';
import { useNow } from '../utils/hooks';
import {
  ALL_SERIES,
  CONTEXT_SERIES,
  SERIES_META,
  VITAL_SERIES,
  groupSymptomsByDay,
  type SeriesKey,
} from '../utils/reportMeta';
import { describeCorrelation, mean, pearson } from '../utils/stats';
import { useVitals } from '../utils/VitalsContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import StatTile from '../components/report/StatTile';
import TrendCard from '../components/report/TrendCard';
import CrossRefChart from '../components/report/CrossRefChart';
import CorrelationMatrix from '../components/report/CorrelationMatrix';
import DailyTable from '../components/report/DailyTable';
import SymptomTimeline from '../components/report/SymptomTimeline';
import AlertRecord from '../components/report/AlertRecord';
import './pages.css';

const DAY = 86_400_000;

const TRENDS: { key: SeriesKey; bad: 'up' | 'down' | 'both'; threshold: number }[] = [
  { key: 'systolic', bad: 'up', threshold: 4 },
  { key: 'diastolic', bad: 'up', threshold: 3 },
  { key: 'hr', bad: 'both', threshold: 5 },
  { key: 'spo2', bad: 'down', threshold: 1 },
  { key: 'temp', bad: 'up', threshold: 0.3 },
  { key: 'sleep', bad: 'down', threshold: 0.5 },
  { key: 'water', bad: 'down', threshold: 0.3 },
  { key: 'co2', bad: 'up', threshold: 0.2 },
];

const isMetric = (k: SeriesKey): k is Metric => k in PERSONAL_NORMAL;

export default function ReportPage({ onLogSymptom }: { onLogSymptom: () => void }) {
  const { alerts, symptoms, current } = useVitals();
  const now = useNow(60_000);
  const [left, setLeft] = useState<SeriesKey>('systolic');
  const [right, setRight] = useState<SeriesKey>('co2');

  /* ---- headline numbers ---- */
  const alertsWeek = alerts.filter((a) => now - Date.parse(a.time) <= 7 * DAY);
  const alerts24 = alertsWeek.filter((a) => now - Date.parse(a.time) <= DAY);
  const symptomsWeek = symptoms.filter((s) => now - Date.parse(s.time) <= 7 * DAY);
  const nominalPct = useMemo(() => {
    const ok = WEEK_SAMPLES.filter(
      (s) => STATUS_RANK[worstStatus(evaluateSample(s).map((e) => e.status))] < STATUS_RANK.warning,
    ).length;
    return Math.round((ok / WEEK_SAMPLES.length) * 100);
  }, []);
  const latest = roundSample(current);

  /* ---- trends: today vs previous 7 days ---- */
  const today = MISSION_DAYS[MISSION_DAYS.length - 1];
  const prev7 = MISSION_DAYS.slice(-8, -1);
  const last7 = MISSION_DAYS.slice(-7);

  /* ---- cross reference ---- */
  const symByDay = useMemo(() => groupSymptomsByDay(symptoms), [symptoms]);
  const xref = useMemo(() => {
    const lv = MISSION_DAYS.map((d) => d[left]);
    const rv = MISSION_DAYS.map((d) => d[right]);
    const r = pearson(lv, rv);
    const rLag = pearson(lv.slice(1), rv.slice(0, -1)); // right today → left tomorrow
    const sorted = [...rv].sort((a, b) => a - b);
    const cut = sorted[Math.floor(sorted.length * (2 / 3))];
    const hi = MISSION_DAYS.filter((d) => d[right] >= cut);
    const lo = MISSION_DAYS.filter((d) => d[right] < cut);
    const sxRate = (arr: typeof MISSION_DAYS) => (arr.length ? arr.filter((d) => symByDay.has(d.day)).length / arr.length : 0);
    return {
      r,
      rLag,
      hiMean: mean(hi.map((d) => d[left])),
      loMean: mean(lo.map((d) => d[left])),
      hiSx: sxRate(hi),
      loSx: sxRate(lo),
      cut,
    };
  }, [left, right, symByDay]);

  const matrixVectors = useMemo(
    () => [
      ...ALL_SERIES.map((k) => ({ key: k, label: SERIES_META[k].short, values: MISSION_DAYS.map((d) => d[k]) })),
      { key: 'symptoms', label: 'Sx', values: MISSION_DAYS.map((d) => symByDay.get(d.day)?.length ?? 0) },
    ],
    [symByDay],
  );

  const lm = SERIES_META[left];
  const rm = SERIES_META[right];

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow={`Mission report · D1–D${TODAY_DAY}`}
        title="Report"
        subtitle="What you logged and what the sensors saw, side by side with the cabin and orbit data."
        aside={<span className="mono small muted">Downlink to flight surgeon · 18:00</span>}
      />

      <div className="stat-grid">
        <StatTile tone="critical" label="Alerts this week" value={String(alertsWeek.length)} sub={`${alerts24.length} in the last 24 hours`} />
        <StatTile tone="warning" label="Symptoms logged" value={String(symptomsWeek.length)} sub="Last 7 days, astronaut reported" />
        <StatTile tone="normal" label="Time in nominal range" value={`${nominalPct}%`} sub={`Across ${WEEK_SAMPLES.length} samples`} />
        <StatTile
          tone="advisory"
          small
          label="Latest reading"
          value={`${latest.systolic}/${latest.diastolic}`}
          sub={`${latest.hr} bpm · ${latest.spo2}% · ${latest.temp.toFixed(1)} °C`}
        />
      </div>

      <div className="section-head">
        <h2>Change over the last days</h2>
        <span className="eyebrow">Today vs 7-day avg</span>
      </div>
      <div className="trend-grid">
        {TRENDS.map((t) => {
          const m = SERIES_META[t.key];
          return (
            <TrendCard
              key={t.key}
              label={m.label}
              unit={m.unit}
              digits={m.digits}
              today={today[t.key]}
              avg={mean(prev7.map((d) => d[t.key]))}
              series={last7.map((d) => d[t.key])}
              badDirection={t.bad}
              threshold={t.threshold}
            />
          );
        })}
      </div>

      <div className="section-head">
        <h2>Cross-reference</h2>
        <span className="eyebrow">42 days · vitals × environment × symptoms</span>
      </div>
      <Card className="xref-card">
        <div className="xref-controls">
          <label>
            <span className="xref-controls__swatch" style={{ background: 'var(--series-a)' }} />
            <select
              className="select"
              value={left}
              onChange={(e) => {
                const v = e.target.value as SeriesKey;
                setLeft(v);
                if (v === right) setRight(v === 'co2' ? 'dose' : 'co2');
              }}
            >
              {[...VITAL_SERIES, 'sleep' as SeriesKey].map((k) => (
                <option key={k} value={k}>
                  {SERIES_META[k].label}
                </option>
              ))}
            </select>
          </label>
          <span className="muted">against</span>
          <label>
            <span className="xref-controls__swatch" style={{ background: 'var(--series-b)' }} />
            <select className="select" value={right} onChange={(e) => setRight(e.target.value as SeriesKey)}>
              {[...CONTEXT_SERIES, ...VITAL_SERIES].filter((k) => k !== left).map((k) => (
                <option key={k} value={k}>
                  {SERIES_META[k].label}
                </option>
              ))}
            </select>
          </label>
          <span className="muted small xref-controls__hint">Green band = your normal · dots under the axis = symptom days</span>
        </div>

        <div className="xref-layout">
          <CrossRefChart
            days={MISSION_DAYS}
            left={left}
            right={right}
            symptomsByDay={symByDay}
            band={isMetric(left) ? PERSONAL_NORMAL[left] : undefined}
            events={[
              { day: EVENTS.eva, label: 'EVA' },
              { day: EVENTS.solar, label: 'SPE' },
            ]}
            shadeFrom={EVENTS.co2Rise}
            shadeLabel="CO₂ > 2.0"
          />
          <div className="insights">
            <div className="insight">
              <p className="insight__num">r = {xref.r.toFixed(2)}</p>
              <p className="insight__label">Same day: {describeCorrelation(xref.r)}.</p>
            </div>
            <div className="insight">
              <p className="insight__num">r = {xref.rLag.toFixed(2)}</p>
              <p className="insight__label">
                {rm.label} today vs {lm.label.toLowerCase()} tomorrow.
              </p>
            </div>
            <div className="insight">
              <p className="insight__num">
                {xref.hiMean.toFixed(lm.digits || 1)} <small>vs</small> {xref.loMean.toFixed(lm.digits || 1)}
              </p>
              <p className="insight__label">
                Avg {lm.label.toLowerCase()} on days with {rm.label.toLowerCase()} ≥ {xref.cut.toFixed(rm.digits)} {rm.unit} vs the rest.
              </p>
            </div>
            <div className="insight">
              <p className="insight__num">
                {Math.round(xref.hiSx * 100)}% <small>vs</small> {Math.round(xref.loSx * 100)}%
              </p>
              <p className="insight__label">Share of those days with a logged symptom.</p>
            </div>
            <p className="small muted">Correlation flags things to look at, not causes. Flag anything odd to the flight surgeon.</p>
          </div>
        </div>
      </Card>

      <div className="report-2col">
        <Card title="Correlation matrix" aside={<span>tap a cell to plot the pair</span>}>
          <CorrelationMatrix
            vectors={matrixVectors}
            active={[left, right]}
            onPick={(a, b) => {
              if (a === 'symptoms' || b === 'symptoms') return;
              const A = a as SeriesKey;
              const B = b as SeriesKey;
              // keep a vital on the left axis when possible
              if (VITAL_SERIES.includes(B) && !VITAL_SERIES.includes(A)) {
                setLeft(B);
                setRight(A);
              } else {
                setLeft(A);
                setRight(B);
              }
            }}
          />
        </Card>
        <Card title="How to read this report">
          <ul className="read-list">
            <li>
              <b>Your normal</b> is learned from mission days 1–14, so a value can be fine for most people but unusual for you.
            </li>
            <li>
              <b>Trends</b> compare today with the average of the previous 7 days. Red means it moved in the direction that matters.
            </li>
            <li>
              <b>Cross-reference</b> lines up one body signal with one cabin or habit dataset. The shaded area marks days with cabin CO₂ above
              target.
            </li>
            <li>
              <b>Daily log</b> flags any cell more than 2 standard deviations from your baseline.
            </li>
          </ul>
        </Card>
      </div>

      <div className="section-head">
        <h2>Daily log</h2>
        <span className="eyebrow">Every dataset · every mission day</span>
      </div>
      <Card>
        <DailyTable days={MISSION_DAYS} symptomsByDay={symByDay} />
      </Card>

      <div className="report-2col report-2col--logs">
        <SymptomTimeline symptoms={symptoms} onAdd={onLogSymptom} />
        <AlertRecord alerts={alerts} />
      </div>
    </div>
  );
}
