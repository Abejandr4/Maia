import { daily, earth, levelOf, measurementTexts, spacewalk } from '../../../data/maiaData';
import { MISSION_DAYS, TODAY_DAY } from '../../../utils/mockData';
import type { Place } from '../../../utils/VitalsContext';

/**
 * "How your values have been" — a log that goes with the report, built for the current place:
 *  - ISS: last 7 mission days vs the personal band (analysis, maia_daily.json)
 *  - Back on Earth: days 1–14 after landing (synthetic "iris (sample)")
 *  - Spacewalk: the EVA day (synthetic "tomas (sample)")
 * plus what the astronaut measured in Body & Sensors → Measure (saved on this device).
 * Every number is computed from those data; nothing is estimated here.
 */
export interface LogRow { name: string; unit: string; days: string; range: string; mean: string; outside: number; of: number; trend: string; tone: 'ok' | 'watch' }
export interface ValuesLogData { title: string; period: string; source: string; rows: LogRow[]; measured: MeasuredRow[] }
interface MeasuredRow { name: string; value: string; level: string; at: string }

const fin = (xs: number[]) => xs.filter(Number.isFinite);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
function row(name: string, unit: string, values: number[], digits: number, isOff: (v: number) => boolean, periodLabel: string): LogRow {
  const v = fin(values);
  const outside = v.filter(isOff).length;
  const first = v[0], last = v[v.length - 1];
  const diff = last - first;
  const flat = Math.abs(diff) < Math.pow(10, -digits);
  return {
    name, unit, days: periodLabel,
    range: v.length ? `${Math.min(...v).toFixed(digits)}–${Math.max(...v).toFixed(digits)}` : '—',
    mean: v.length ? mean(v).toFixed(digits) : '—',
    outside, of: v.length,
    trend: v.length < 2 ? '—' : flat ? 'steady' : `${diff > 0 ? '+' : ''}${diff.toFixed(digits)} ${unit}`,
    tone: outside > 0 ? 'watch' : 'ok',
  };
}

/** What the astronaut saved in Measure (localStorage 'maia-guided-measurements'). */
function measuredOnDevice(): MeasuredRow[] {
  try {
    const saved = JSON.parse(localStorage.getItem('maia-guided-measurements') ?? 'null') as
      Record<string, { values: Record<string, number>; level: string; at: string }> | null;
    if (!saved) return [];
    return Object.entries(saved).map(([id, r]) => ({
      name: measurementTexts[id]?.name ?? id.replaceAll('_', ' '),
      value: Object.values(r.values).join(' / '),
      level: r.level,
      at: r.at,
    }));
  } catch {
    return [];
  }
}

function issLog(): ValuesLogData {
  const last = MISSION_DAYS.slice(-7);
  const B = daily.bands;
  const off = (k: keyof typeof B) => (v: number) => v < (B[k]?.low ?? -Infinity) || v > (B[k]?.high ?? Infinity);
  const period = `D${last[0].day}–D${TODAY_DAY}`;
  return {
    title: 'Last 7 days on the ISS',
    period,
    source: 'Analysis of the mission days (maia_daily.json) · outside = outside your personal band (days 8–21)',
    rows: [
      row('Resting heart rate', 'bpm', last.map((d) => d.hr), 0, off('heart_rate'), period),
      row('Blood pressure (systolic)', 'mmHg', last.map((d) => d.systolic), 0, off('bp_systolic'), period),
      row('Blood pressure (diastolic)', 'mmHg', last.map((d) => d.diastolic), 0, off('bp_diastolic'), period),
      row('Oxygen (SpO₂)', '%', last.map((d) => d.spo2), 0, off('spo2'), period),
      row('Temperature', '°C', last.map((d) => d.temp), 1, off('temperature'), period),
      row('Sleep', 'h', last.map((d) => d.sleep), 1, off('sleep'), period),
    ],
    measured: measuredOnDevice(),
  };
}

function earthLog(): ValuesLogData {
  const D = earth.days;
  const L = earth.limits;
  const period = `R+1–R+${D[D.length - 1].day_after_landing}`;
  const off = (id: string) => (v: number) => levelOf(L, id, v) !== 'green';
  return {
    title: 'Back on Earth · first days after landing',
    period,
    source: `Sample data (${earth.person}, synthetic_data.csv) · outside = outside green of measurement_ranges.csv`,
    rows: [
      row('Blood pressure drop when standing', 'mmHg', D.map((d) => d.orthostatic_sys_drop), 0, off('orthostatic_sys_drop'), period),
      row('Resting heart rate', 'bpm', D.map((d) => d.heart_rate), 0, off('heart_rate'), period),
      row('Sleep', 'h', D.map((d) => d.sleep), 1, off('sleep'), period),
    ],
    measured: measuredOnDevice(),
  };
}

function evaLog(): ValuesLogData {
  const S = spacewalk.samples;
  const L = spacewalk.limits;
  const period = `0–${spacewalk.duration_min} min`;
  const off = (id: string) => (v: number) => levelOf(L, id, v) !== 'green';
  const mins = (r: LogRow) => ({ ...r, outside: r.outside * spacewalk.interval_min, of: spacewalk.duration_min });
  return {
    title: 'Spacewalk',
    period,
    source: `Sample data (${spacewalk.person}, synthetic_data.csv) · one reading every ${spacewalk.interval_min} min · outside = minutes outside green`,
    rows: [
      mins(row('Suit pressure', 'psi', S.map((x) => x.suit_pressure), 2, off('suit_pressure'), period)),
      mins(row('Suit CO₂', 'mmHg', S.map((x) => x.suit_co2), 1, off('suit_co2'), period)),
      mins(row('Heart rate', 'bpm', S.map((x) => x.heart_rate), 0, off('heart_rate'), period)),
    ],
    measured: measuredOnDevice(),
  };
}

/** Logs sent with the report: the current place (Moon / Mars previews have no health data → ISS record),
 *  plus the spacewalk if one was done in this session. "Measured by you" goes only in the first one. */
export function valuesLogsFor(place: Place, evaDone: boolean): ValuesLogData[] {
  const main = place === 'earth' ? earthLog() : issLog();
  return evaDone ? [main, { ...evaLog(), measured: [] }] : [main];
}

/** Size the logs add to the downlink packet (their JSON). */
export const logSizeKb = (logs: ValuesLogData[]) => new Blob([JSON.stringify(logs)]).size / 1024;

export default function ValuesLog({ log, technical = false }: { log: ValuesLogData; technical?: boolean }) {
  const watch = log.rows.filter((r) => r.tone === 'watch');
  return (
    <section className="values-log card">
      <header className="values-log__head">
        <div>
          <p className="eyebrow">How your values have been · sent with this report</p>
          <h2 className="values-log__title">{log.title} <span>· {log.period}</span></h2>
        </div>
        <span className={`values-log__pill values-log__pill--${watch.length ? 'watch' : 'ok'}`}>
          {watch.length ? `${watch.length} to watch` : 'All in range'}
        </span>
      </header>

      {!technical && (
        <p className="values-log__plain">
          {watch.length === 0
            ? 'Everything stayed inside your range in this period.'
            : `${watch.length * 2 >= log.rows.length ? 'Several values' : 'A few values'} went outside your range ${log.title === 'Spacewalk' ? 'for part of the time' : 'on some days'}: ${watch.map((r) => r.name).join(', ')}. Your doctor sees the details.`}
        </p>
      )}

      <div className="table-wrap">
        <table className="values-log__table">
          <thead>
            <tr><th>Measure</th><th>Range</th><th>Average</th><th>Change</th><th>Outside</th></tr>
          </thead>
          <tbody>
            {log.rows.map((r) => (
              <tr key={r.name} data-tone={r.tone}>
                <td>{r.name}</td>
                <td className="num">{r.range} <small>{r.unit}</small></td>
                <td className="num">{r.mean}</td>
                <td className="num">{r.trend}</td>
                <td className="num">{r.outside} / {r.of}{log.title === 'Spacewalk' ? ' min' : ' days'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(log.measured.length > 0 || log.title !== 'Spacewalk') && <div className="values-log__measured">
        <div className="analysis-label">Measured by you (Body & Sensors → Measure)</div>
        {log.measured.length ? (
          <ul>
            {log.measured.map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <strong className="num">{m.value}</strong>
                <span className={`values-log__lvl values-log__lvl--${m.level}`}>{m.level}</span>
                <span className="small muted">{new Date(m.at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>Nothing measured on this device yet. What you record in Measure is added here.</p>
        )}
      </div>}
      <p className="small muted" style={{ margin: 0 }}>{log.source}</p>
    </section>
  );
}
