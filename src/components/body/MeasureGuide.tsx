import { useEffect, useRef, useState } from 'react';
import { classify, roundSample, worstStatus } from '../../utils/baselines';
import { clock } from '../../utils/format';
import { useVitals } from '../../utils/VitalsContext';
import Card from '../ui/Card';
import Icon from '../ui/Icon';
import StatusPill from '../ui/StatusPill';
import './body.css';

const STEPS = [
  { title: 'Settle', text: 'Strap your feet into the restraint and rest quietly for 5 minutes.' },
  { title: 'Position the cuff', text: 'Left upper arm, bare skin, cuff at heart level. Tube runs down the inside of the arm.' },
  { title: 'Stay still', text: 'No talking or moving during inflation. Breathe normally.' },
  { title: 'Take the reading', text: 'Press the button below. Repeat once after 1 minute if it is above your normal.' },
];

interface Reading {
  at: number;
  systolic: number;
  diastolic: number;
  hr: number;
}

/** "Measure" tab: guided manual blood pressure measurement. */
export default function MeasureGuide() {
  const { current } = useVitals();
  const currentRef = useRef(current);
  const timerRef = useRef<number | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => STEPS.map(() => false));
  const [measuring, setMeasuring] = useState(false);
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const ready = checked.slice(0, 3).every(Boolean);

  const measure = () => {
    setMeasuring(true);
    timerRef.current = window.setTimeout(() => {
      const s = roundSample(currentRef.current);
      setReadings((r) => [{ at: Date.now(), systolic: s.systolic, diastolic: s.diastolic, hr: s.hr }, ...r]);
      setChecked((c) => c.map((v, i) => (i === 3 ? true : v)));
      setMeasuring(false);
    }, 3000);
  };

  return (
    <div className="measure">
      <Card title="Blood pressure re-check · guided">
        <ol className="measure__steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className={checked[i] ? 'is-done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <span>
                  <strong>
                    {i + 1}. {s.title}
                  </strong>
                  <span className="small muted">{s.text}</span>
                </span>
              </label>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--primary" disabled={!ready || measuring} onClick={measure}>
          <Icon name="activity" />
          {measuring ? 'Measuring…' : ready ? 'Start measurement' : 'Complete steps 1–3 first'}
        </button>
      </Card>

      <Card title="Today’s manual readings">
        {readings.length === 0 && <p className="muted">No manual readings yet today.</p>}
        <ul className="measure__readings">
          {readings.map((r) => {
            const st = worstStatus([classify('systolic', r.systolic), classify('diastolic', r.diastolic)]);
            return (
              <li key={r.at}>
                <span className="mono muted">{clock(new Date(r.at))}</span>
                <span className="measure__bp mono">
                  {r.systolic}/{r.diastolic} <small>mmHg</small>
                </span>
                <span className="mono small muted">{r.hr} bpm</span>
                <StatusPill status={st} size="sm" />
              </li>
            );
          })}
        </ul>
        <p className="small muted">
          If two readings in a row are above your normal, the report sent to the flight surgeon at 18:00 will flag it.
        </p>
      </Card>
    </div>
  );
}
