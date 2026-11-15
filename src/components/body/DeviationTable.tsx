import type { Metric } from '../../utils/types';
import { GENERAL_REF, PERSONAL_NORMAL, classify, mid, rangeText, roundSample } from '../../utils/baselines';
import { signed } from '../../utils/format';
import { MISSION_DAYS } from '../../utils/mockData';
import { mean } from '../../utils/stats';
import { useVitals } from '../../utils/VitalsContext';
import Card from '../ui/Card';
import StatusPill from '../ui/StatusPill';
import './body.css';

const ROWS: { key: Metric; label: string; unit: string; digits: number; why: string }[] = [
  { key: 'systolic', label: 'Systolic BP', unit: 'mmHg', digits: 0, why: 'Fluid shifts toward the head in microgravity and changes cardiac load.' },
  { key: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', digits: 0, why: 'Rising together with systolic points to sustained pressure, not a one-off.' },
  { key: 'hr', label: 'Heart rate', unit: 'bpm', digits: 0, why: 'Resting rate climbs with poor sleep, dehydration or high CO₂.' },
  { key: 'spo2', label: 'Blood oxygen', unit: '%', digits: 0, why: 'Drops can mean a sensor problem, a cabin/suit O₂ problem, or illness.' },
  { key: 'temp', label: 'Core temperature', unit: '°C', digits: 1, why: 'Immune changes in flight make infections worth catching early.' },
];

/** "Analysis" tab: live value vs personal normal and how the last week compares with the baseline. */
export default function DeviationTable() {
  const { current } = useVitals();
  const s = roundSample(current);
  const baseline = MISSION_DAYS.filter((d) => d.day >= 8 && d.day <= 21);
  const recent = MISSION_DAYS.slice(-7);

  return (
    <Card title="Deviation from your normal" aside={<span>baseline = flight days 8–21</span>}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Signal</th>
              <th className="num">Live</th>
              <th>Your normal</th>
              <th>General ref</th>
              <th className="num">Δ vs normal</th>
              <th className="num">Baseline avg</th>
              <th className="num">Last 7 d avg</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const v = s[r.key];
              const pn = PERSONAL_NORMAL[r.key];
              const d = r.digits || 1;
              const recentAvg = mean(recent.map((x) => x[r.key]).filter(Number.isFinite));
              const baseAvg = mean(baseline.map((x) => x[r.key]).filter(Number.isFinite));
              return (
                <tr key={r.key} title={r.why}>
                  <td className="is-sans">{r.label}</td>
                  <td className="num">
                    {v.toFixed(r.digits)} {r.unit}
                  </td>
                  <td>{rangeText(pn, r.digits)}</td>
                  <td>{rangeText(GENERAL_REF[r.key], r.digits)}</td>
                  <td className="num">{signed(v - mid(pn), d)}</td>
                  <td className="num">{baseAvg.toFixed(d)}</td>
                  <td className={`num ${Math.abs(recentAvg - baseAvg) > (pn.max - pn.min) / 2 ? 'is-flag' : ''}`}>
                    {recentAvg.toFixed(d)}
                  </td>
                  <td>
                    <StatusPill status={classify(r.key, v)} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="why-list">
        {ROWS.map((r) => (
          <li key={r.key}>
            <strong>{r.label}.</strong> {r.why}
          </li>
        ))}
      </ul>
    </Card>
  );
}
