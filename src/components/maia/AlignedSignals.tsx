import { useState } from 'react';
import { useMeasure } from '../../utils/hooks';
import { scaleLinear } from '../../utils/stats';
import './maia.css';

export interface SignalRow {
  key: string;
  label: string;
  unit: string;
  digits: number;
  points: { day: number; value: number | null; side: string }[];
  band?: { low: number | null; high: number | null };
  /** General (green) reference limits, drawn dashed. */
  refs: number[];
  /** Marked-change episodes to shade. */
  episodes: { from: number; to: number }[];
}

interface Props {
  rows: SignalRow[];
  toDay: number;
  events: { day: number; label: string }[];
  symptomDays: number[];
}

const ROW_H = 58;
const M = { t: 34, l: 112, r: 12, b: 26 };

/** All signals on one timeline: personal band, general reference, events and symptom days. */
export default function AlignedSignals({ rows, toDay, events, symptomDays }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(0, width - M.l - M.r);
  const H = M.t + rows.length * ROW_H + 34 + M.b;
  const x = scaleLinear(1, toDay, M.l, M.l + w);
  const symY = M.t + rows.length * ROW_H + 16;

  return (
    <div className="chart maia-aligned" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const d = Math.round(1 + ((px - M.l) / (w || 1)) * (toDay - 1));
            setHover(d >= 1 && d <= toDay ? d : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {events.map((ev, i) => (
            <g key={ev.label + ev.day} className="chart-event">
              <line x1={x(ev.day)} x2={x(ev.day)} y1={M.t - 8 - (i % 2) * 12} y2={symY} />
              <text x={x(ev.day) + 4} y={M.t - 10 - (i % 2) * 12}>
                {ev.label}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const top = M.t + i * ROW_H + 6;
            const h = ROW_H - 16;
            const vals = r.points.map((p) => p.value).filter((v): v is number => v != null);
            const ext = [...vals, ...r.refs, ...(r.band?.low != null ? [r.band.low] : []), ...(r.band?.high != null ? [r.band.high] : [])];
            let lo = Math.min(...ext);
            let hi = Math.max(...ext);
            const pad = (hi - lo || 1) * 0.08;
            lo -= pad;
            hi += pad;
            const y = scaleLinear(lo, hi, top + h, top);
            let d = '';
            let pen = false;
            r.points.forEach((p) => {
              if (p.value == null) {
                pen = false;
                return;
              }
              d += `${pen ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`;
              pen = true;
            });
            const hp = hover != null ? r.points.find((p) => p.day === hover) : undefined;
            return (
              <g key={r.key}>
                <text x={M.l - 12} y={top + h / 2 - 2} textAnchor="end" className="maia-aligned__label">
                  {r.label}
                </text>
                <text x={M.l - 12} y={top + h / 2 + 12} textAnchor="end" className="maia-aligned__unit">
                  {hp ? (hp.value != null ? hp.value.toFixed(r.digits) : 'missing') : r.unit}
                </text>
                {r.episodes.map((e) => (
                  <rect key={e.from} x={x(e.from) - 3} width={x(e.to) - x(e.from) + 6} y={top} height={h} className="maia-zone--highlight" />
                ))}
                {r.band?.low != null && r.band?.high != null && (
                  <rect x={M.l} width={w} y={y(r.band.high)} height={Math.max(1, y(r.band.low) - y(r.band.high))} className="chart-band" />
                )}
                {r.refs.map((v) => (
                  <line key={v} x1={M.l} x2={M.l + w} y1={y(v)} y2={y(v)} className="maia-ref maia-ref--green" />
                ))}
                {r.points
                  .filter((p) => p.value == null)
                  .map((p) => (
                    <rect key={p.day} x={x(p.day - 0.5)} width={x(p.day + 0.5) - x(p.day - 0.5)} y={top} height={h} className="maia-missing" />
                  ))}
                <path d={d} className="maia-line maia-line--thin" />
                {r.points
                  .filter((p) => p.value != null && (p.side === 'high' || p.side === 'low') && p.day > 21)
                  .map((p) => (
                    <circle key={p.day} cx={x(p.day)} cy={y(p.value as number)} r={2.6} className="maia-mark" />
                  ))}
                <line x1={M.l} x2={M.l + w} y1={top + h + 8} y2={top + h + 8} className="maia-aligned__sep" />
              </g>
            );
          })}
          <text x={M.l - 12} y={symY + 4} textAnchor="end" className="maia-aligned__label">
            Symptoms
          </text>
          {symptomDays.map((d) => (
            <circle key={d} cx={x(d)} cy={symY} r={4.5} className="maia-sym" />
          ))}
          <g className="chart-axis">
            {[1, 7, 14, 21, 28, 35, toDay]
              .filter((t, i, a) => t <= toDay && a.indexOf(t) === i)
              .map((t) => (
                <text key={t} x={x(t)} y={H - 6} textAnchor="middle">
                  D{t}
                </text>
              ))}
          </g>
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={symY + 8} className="chart-cursor" />}
        </svg>
      )}
    </div>
  );
}
