import type { RoutineBlock, RoutineTask } from '../../utils/types';
import { clock, hourOf } from '../../utils/format';
import './home.css';

interface RoutineClockProps {
  blocks: RoutineBlock[];
  tasks: RoutineTask[];
  now: Date;
  day: number;
  onTaskClick: (t: RoutineTask) => void;
}

const S = 340;
const C = S / 2;
const R = 118; // block ring
const R_DOTS = 150; // task dots

const ang = (h: number) => (h / 24) * Math.PI * 2 - Math.PI / 2;
const pt = (h: number, r: number): [number, number] => [C + r * Math.cos(ang(h)), C + r * Math.sin(ang(h))];

function arcPath(h0: number, h1: number, r: number) {
  let span = h1 - h0;
  if (span <= 0) span += 24;
  const [x0, y0] = pt(h0, r);
  const [x1, y1] = pt(h0 + span, r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** 24-hour dial: 00 at the top, clockwise. Tap a dot to open its task. */
export default function RoutineClock({ blocks, tasks, now, day, onTaskClick }: RoutineClockProps) {
  const nowH = now.getHours() + now.getMinutes() / 60;
  const [hx, hy] = pt(nowH, R - 34);

  return (
    <svg viewBox={`-14 -14 ${S + 28} ${S + 28}`} className="routine-clock" role="group" aria-label="24-hour routine">
      <circle cx={C} cy={C} r={R} className="clock__face" />

      {Array.from({ length: 24 }, (_, h) => {
        const major = h % 6 === 0;
        const [x0, y0] = pt(h, R - (major ? 14 : 8));
        const [x1, y1] = pt(h, R - 2);
        return <line key={h} x1={x0} y1={y0} x2={x1} y2={y1} className={major ? 'clock__tick clock__tick--major' : 'clock__tick'} />;
      })}
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = pt(h, R - 28);
        return (
          <text key={h} x={x} y={y + 4} textAnchor="middle" className="clock__label">
            {String(h).padStart(2, '0')}
          </text>
        );
      })}

      {blocks.map((b) => (
        <path key={b.label} d={arcPath(b.start, b.end, R)} className={`clock__block clock__block--${b.kind}`} />
      ))}

      <line x1={C} y1={C} x2={hx} y2={hy} className="clock__hand" />
      <circle cx={C} cy={C} r={5} className="clock__pivot" />

      <text x={C} y={C + 6} textAnchor="middle" className="clock__time">
        {clock(now)}
      </text>
      <text x={C} y={C + 26} textAnchor="middle" className="clock__day">
        DAY {day}
      </text>

      {tasks.map((t) => {
        const [x, y] = pt(hourOf(t.time), R_DOTS);
        return (
          <g
            key={t.id}
            className={`clock-dot clock-dot--${t.state}`}
            transform={`translate(${x} ${y})`}
            onClick={() => onTaskClick(t)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTaskClick(t);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${t.time} ${t.label}, ${t.state}`}
          >
            <circle r={11} />
            {t.state === 'done' ? (
              <path d="M-4.5 0.5l3 3 6-6.5" className="clock-dot__check" />
            ) : (
              <text dy="3.5" textAnchor="middle">
                {t.time.slice(0, 2)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
