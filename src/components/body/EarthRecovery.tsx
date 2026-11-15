import MaiaLineChart, { type RefLine } from '../maia/MaiaLineChart';
import { earth, greenText, levelOf, type Level } from '../../data/maiaData';
import Card from '../ui/Card';

/**
 * Back on Earth: re-adaptation after landing (days 1–14).
 * Data: "iris (sample)" rows of synthetic_data.csv (step4b) — all synthetic.
 * Limits: measurement_ranges.csv, location = back_on_earth.
 */
const DAYS = earth.days;
const TODAY = DAYS[DAYS.length - 1];
const L = earth.limits;
const DIZZY_DAYS = DAYS.filter((d) => d.symptom === 'dizziness').map((d) => d.day_after_landing);

/** Standing BP drop: ≥ 20 mmHg = yellow; with dizziness the same day = red (measurement_ranges notes). */
function dropLevel(day: (typeof DAYS)[number]): Level {
  const base = levelOf(L, 'orthostatic_sys_drop', day.orthostatic_sys_drop);
  return base === 'yellow' && day.symptom === 'dizziness' ? 'red' : base;
}

const METRICS = [
  {
    id: 'orthostatic_sys_drop', label: 'Blood pressure drop when standing', unit: 'mmHg', digits: 0,
    value: (d: (typeof DAYS)[number]) => d.orthostatic_sys_drop, level: dropLevel,
    what: 'How much your systolic pressure falls in the first 3 minutes after you stand up. Your body is re-learning gravity.',
    act: 'Stand up slowly, sit down if you feel dizzy, and log it.',
  },
  {
    id: 'heart_rate', label: 'Resting heart rate', unit: 'bpm', digits: 0,
    value: (d: (typeof DAYS)[number]) => d.heart_rate, level: (d: (typeof DAYS)[number]) => levelOf(L, 'heart_rate', d.heart_rate),
    what: 'Usually higher in the first days after landing and settles over two weeks.',
    act: 'Measure it in the morning, before getting up.',
  },
  {
    id: 'sleep', label: 'Sleep', unit: 'h', digits: 1,
    value: (d: (typeof DAYS)[number]) => d.sleep, level: (d: (typeof DAYS)[number]) => levelOf(L, 'sleep', d.sleep),
    what: 'Sleep on Earth: aim for 7 h or more.',
    act: 'Keep regular sleep and wake times.',
  },
] as const;

const WORD: Record<Level, string> = { green: 'In range', yellow: 'Watch', red: 'Act now', none: '—' };

function refLines(id: string): RefLine[] {
  const r = L.find((l) => l.measurement_id === id);
  if (!r) return [];
  const out: RefLine[] = [];
  if (r.ref_green_max != null) out.push({ value: r.ref_green_max, label: `green ≤ ${r.ref_green_max}`, tone: 'green' });
  if (r.ref_green_min != null) out.push({ value: r.ref_green_min, label: `green ≥ ${r.ref_green_min}`, tone: 'green' });
  if (r.ref_red_above != null) out.push({ value: r.ref_red_above, label: `red > ${r.ref_red_above}`, tone: 'red' });
  if (r.ref_red_below != null) out.push({ value: r.ref_red_below, label: `red < ${r.ref_red_below}`, tone: 'red' });
  return out;
}

export default function EarthRecovery() {
  const firstGreenDrop = DAYS.find((_, i) => DAYS.slice(i).every((x) => dropLevel(x) === 'green'))?.day_after_landing;
  return (
    <div className="earth-recovery">
      <Card title={`Back on Earth · R+${TODAY.day_after_landing}`} aside={<span className="small muted">Sample data · {earth.person}</span>}>
        <p style={{ margin: '0 0 6px' }}>{earth.context.description}</p>
        <p className="small muted" style={{ margin: 0 }}>
          {firstGreenDrop
            ? `Your standing blood-pressure drop has been in range since R+${firstGreenDrop}. `
            : 'Your standing blood-pressure drop is still above range. '}
          Dizziness logged on {DIZZY_DAYS.map((d) => `R+${d}`).join(', ') || 'no day'}.
        </p>
      </Card>

      <div className="earth-recovery__tiles">
        {METRICS.map((m) => {
          const level = m.level(TODAY);
          return (
            <Card key={m.id} className={`earth-tile earth-tile--${level}`}>
              <div className="analysis-label">{m.label}</div>
              <div className="earth-tile__value">{m.value(TODAY).toFixed(m.digits)} <small>{m.unit}</small></div>
              <span className={`earth-tile__pill earth-tile__pill--${level}`}>{WORD[level]}</span>
              <p className="small muted" style={{ margin: '6px 0 0' }}>Green {greenText(L, m.id)} {m.unit} · today R+{TODAY.day_after_landing}</p>
            </Card>
          );
        })}
      </div>

      {METRICS.map((m) => {
        const off = DAYS.filter((d) => m.level(d) !== 'green' && m.level(d) !== 'none').map((d) => d.day_after_landing);
        return (
          <Card key={m.id} title={`${m.label} · 14 days after landing`}>
            <p className="small" style={{ margin: '0 0 6px' }}>{m.what} <strong>{m.act}</strong></p>
            <MaiaLineChart
              points={DAYS.map((d) => ({ day: d.day_after_landing, value: m.value(d) }))}
              refLines={refLines(m.id)}
              events={m.id === 'orthostatic_sys_drop' ? DIZZY_DAYS.map((d) => ({ day: d, label: 'Dizziness' })) : []}
              markDays={off}
              unit={m.unit}
              digits={m.digits}
              height={190}
              fromDay={1}
              toDay={14}
              dayPrefix="R+"
            />
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              {off.length ? `Outside green on ${off.map((d) => `R+${d}`).join(', ')}.` : 'Inside green every day.'}{' '}
              {L.find((l) => l.measurement_id === m.id)?.notes} · Source {L.find((l) => l.measurement_id === m.id)?.source} · synthetic (is_synthetic = yes)
            </p>
          </Card>
        );
      })}
    </div>
  );
}
