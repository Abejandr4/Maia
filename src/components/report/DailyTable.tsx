import { useMemo, useState } from 'react';
import type { DayRecord, SymptomEntry } from '../../utils/types';
import { shortDate } from '../../utils/format';
import { VITAL_SERIES, type SeriesKey } from '../../utils/reportMeta';
import { mean, std, zScore } from '../../utils/stats';
import './report.css';

interface DailyTableProps {
  days: DayRecord[];
  symptomsByDay: Map<number, SymptomEntry[]>;
}

/** Context limits that flag a cell regardless of the astronaut's baseline. */
const LIMIT_FLAGS: Partial<Record<SeriesKey, (v: number) => boolean>> = {
  co2: (v) => v > 2.0,
  dose: (v) => v > 4,
  sleep: (v) => v < 6,
  water: (v) => v < 2,
};

/** Every mission day with every dataset; cells flagged at |z| ≥ 2 vs days 1–14. */
export default function DailyTable({ days, symptomsByDay }: DailyTableProps) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const baseline = useMemo(() => {
    const b = days.slice(0, 14);
    return Object.fromEntries(
      VITAL_SERIES.map((k) => {
        const vals = b.map((d) => d[k]);
        return [k, { m: mean(vals), s: std(vals) }];
      }),
    ) as Record<string, { m: number; s: number }>;
  }, [days]);

  const isFlag = (d: DayRecord, k: SeriesKey) => {
    if (LIMIT_FLAGS[k]) return LIMIT_FLAGS[k]!(d[k]);
    const b = baseline[k];
    return b ? Math.abs(zScore(d[k], b.m, Math.max(b.s, k === 'temp' ? 0.1 : 1))) >= 2 : false;
  };

  const rows = useMemo(() => {
    const all = [...days].reverse();
    const cols: SeriesKey[] = ['systolic', 'diastolic', 'hr', 'spo2', 'temp', 'co2', 'dose', 'sleep', 'water'];
    return all
      .map((d) => ({ d, flags: cols.filter((k) => isFlag(d, k)), sx: symptomsByDay.get(d.day) ?? [] }))
      .filter((r) => !onlyFlagged || r.flags.length > 0 || r.sx.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, onlyFlagged, symptomsByDay, baseline]);

  const visible = showAll ? rows : rows.slice(0, 14);
  const f = (d: DayRecord, k: SeriesKey) => (isFlag(d, k) ? 'num is-flag' : 'num');

  return (
    <div className="daily">
      <div className="daily__controls">
        <label className="toggle">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          <span>Only days with flags or symptoms</span>
        </label>
        <span className="muted small">
          Highlighted = |z| ≥ 2 vs your days 1–14, or outside an environment limit (CO₂ &gt; 2.0, sleep &lt; 6 h, water &lt; 2 L).
        </span>
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
              <th className="num">CO₂</th>
              <th className="num">Dose</th>
              <th className="num">Sleep</th>
              <th className="num">Water</th>
              <th>Symptoms</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ d, sx }) => (
              <tr key={d.day}>
                <td>D{d.day}</td>
                <td className="is-sans">
                  {shortDate(new Date(d.date))}
                  {d.event && <span className="daily__event">{d.event}</span>}
                </td>
                <td className={isFlag(d, 'systolic') || isFlag(d, 'diastolic') ? 'num is-flag' : 'num'}>
                  {d.systolic}/{d.diastolic}
                </td>
                <td className={f(d, 'hr')}>{d.hr}</td>
                <td className={f(d, 'spo2')}>{d.spo2}</td>
                <td className={f(d, 'temp')}>{d.temp.toFixed(1)}</td>
                <td className={f(d, 'co2')}>{d.co2.toFixed(2)}</td>
                <td className={f(d, 'dose')}>{d.dose.toFixed(2)}</td>
                <td className={f(d, 'sleep')}>{d.sleep.toFixed(1)}</td>
                <td className={f(d, 'water')}>{d.water.toFixed(1)}</td>
                <td className="is-sans daily__sx">
                  {sx.map((s) => (
                    <span key={s.id} className={`sev sev--${s.severity}`}>
                      {s.name}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 14 && (
        <button type="button" className="link-btn daily__more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show last 14 days' : `Show all ${rows.length} days`}
        </button>
      )}
    </div>
  );
}
