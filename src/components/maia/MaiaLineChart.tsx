import { useState } from 'react';
import { useMeasure } from '../../utils/hooks';
import { niceTicks, scaleLinear } from '../../utils/stats';
import './maia.css';

export interface ChartPoint {
  day: number;
  value: number | null;
}
export interface RefLine {
  value: number;
  label: string;
  tone: 'red' | 'green' | 'watch';
}

interface MaiaLineChartProps {
  points: ChartPoint[];
  /** Optional second series (e.g. a 7-day mean), drawn dashed. */
  points2?: ChartPoint[];
  label2?: string;
  /** Personal band (median ± 2.5 robust SD). */
  band?: { low: number | null; high: number | null };
  refLines?: RefLine[];
  events?: { day: number; label: string }[];
  /** Shaded day ranges, e.g. adaptation (1–7) and learning window (8–21). */
  zones?: { from: number; to: number; label: string; kind: 'adapt' | 'learn' | 'highlight' }[];
  /** Days drawn with a marker (e.g. marked-change days). */
  markDays?: number[];
  unit?: string;
  digits?: number;
  height?: number;
  step?: boolean;
  fromDay?: number;
  toDay?: number;
  /** Label before the day number on the axis ("D" in flight, "R+" after landing). */
  dayPrefix?: string;
}

const M = { t: 28, r: 64, b: 30, l: 44 };

/** Daily series with personal band, reference limits, events and missing-day gaps. */
export default function MaiaLineChart({
  points,
  points2,
  label2,
  band,
  refLines = [],
  events = [],
  zones = [],
  markDays = [],
  unit = '',
  digits = 1,
  height = 260,
  step = false,
  fromDay,
  toDay,
  dayPrefix = 'D',
}: MaiaLineChartProps) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const d0 = fromDay ?? Math.min(...points.map((p) => p.day));
  const d1 = toDay ?? Math.max(...points.map((p) => p.day));
  const pts = points.filter((p) => p.day >= d0 && p.day <= d1);
  const pts2 = (points2 ?? []).filter((p) => p.day >= d0 && p.day <= d1);
  const vals = [...pts, ...pts2].map((p) => p.value).filter((v): v is number => v != null);
  const extra = [
    ...(band?.low != null ? [band.low] : []),
    ...(band?.high != null ? [band.high] : []),
    ...refLines.map((r) => r.value),
  ];
  let lo = Math.min(...vals, ...extra);
  let hi = Math.max(...vals, ...extra);
  if (!isFinite(lo) || !isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  const pad = (hi - lo || 1) * 0.1;
  lo -= pad;
  hi += pad;

  const w = Math.max(0, width - M.l - M.r);
  const h = height - M.t - M.b;
  const x = scaleLinear(d0, Math.max(d1, d0 + 1), M.l, M.l + w);
  const y = scaleLinear(lo, hi, M.t + h, M.t);
  const ticks = niceTicks(lo, hi, 4);
  const xTicks = [1, 7, 14, 21, 28, 35, 42, 49, 56].filter((t) => t >= d0 && t <= d1);
  if (!xTicks.includes(d1)) xTicks.push(d1);

  // split into segments at missing values, so a gap is visible
  const path = (series: ChartPoint[]) => {
    let d = '';
    let pen = false;
    series.forEach((p, i) => {
      if (p.value == null) {
        pen = false;
        return;
      }
      if (step && pen && i > 0) d += `L${x(p.day).toFixed(1)},${y(series[i - 1].value ?? p.value).toFixed(1)}`;
      d += `${pen ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const missing = pts.filter((p) => p.value == null).map((p) => p.day);
  const hp = hover != null ? pts.find((p) => p.day === hover) : undefined;
  const hp2 = hover != null ? pts2.find((p) => p.day === hover) : undefined;
  const fmt = (v: number) => v.toFixed(digits);

  return (
    <div className="chart maia-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const d = Math.round(d0 + ((px - M.l) / (w || 1)) * (d1 - d0));
            setHover(d >= d0 && d <= d1 ? d : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {zones.map((z) => (
            <g key={z.label}>
              <rect
                x={x(Math.max(z.from, d0) - 0.5)}
                width={Math.max(0, x(Math.min(z.to, d1) + 0.5) - x(Math.max(z.from, d0) - 0.5))}
                y={M.t}
                height={h}
                className={`maia-zone maia-zone--${z.kind}`}
              />
              <text x={x(Math.max(z.from, d0) - 0.5) + 4} y={M.t + h - 6} className="maia-zone__label">
                {z.label}
              </text>
            </g>
          ))}
          {band && band.low != null && band.high != null && (
            <rect x={M.l} width={w} y={y(band.high)} height={Math.max(0, y(band.low) - y(band.high))} className="chart-band" />
          )}
          <g className="chart-grid">
            {ticks.map((t) => (
              <line key={t} x1={M.l} x2={M.l + w} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="chart-axis">
            {ticks.map((t) => (
              <text key={t} x={M.l - 8} y={y(t) + 3.5} textAnchor="end">
                {Math.abs(t) < 10 ? t.toFixed(1) : t.toFixed(0)}
              </text>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y={M.t + h + 18} textAnchor="middle">
                {dayPrefix}{t}
              </text>
            ))}
          </g>
          {missing.map((d) => (
            <rect key={d} x={x(d - 0.5)} width={x(d + 0.5) - x(d - 0.5)} y={M.t} height={h} className="maia-missing" />
          ))}
          {refLines.map((r) => (
            <g key={r.label}>
              <line x1={M.l} x2={M.l + w} y1={y(r.value)} y2={y(r.value)} className={`maia-ref maia-ref--${r.tone}`} />
              <text x={M.l + w + 6} y={y(r.value) + 3.5} className={`maia-ref__label maia-ref__label--${r.tone}`}>
                {r.label}
              </text>
            </g>
          ))}
          {events.map((ev) => (
            <g key={`${ev.day}${ev.label}`} className="chart-event">
              <line x1={x(ev.day)} x2={x(ev.day)} y1={M.t - 14} y2={M.t + h} />
              <text x={x(ev.day) + 4} y={M.t - 4}>
                {ev.label}
              </text>
            </g>
          ))}
          {pts2.length > 0 && <path d={path(pts2)} className="maia-line maia-line--2" />}
          <path d={path(pts)} className="maia-line" />
          {pts
            .filter((p) => p.value != null && markDays.includes(p.day))
            .map((p) => (
              <circle key={p.day} cx={x(p.day)} cy={y(p.value as number)} r={4} className="maia-mark" />
            ))}
          {hp && (
            <g>
              <line x1={x(hp.day)} x2={x(hp.day)} y1={M.t} y2={M.t + h} className="chart-cursor" />
              {hp.value != null && <circle cx={x(hp.day)} cy={y(hp.value)} r={3.5} className="maia-dot" />}
            </g>
          )}
        </svg>
      )}
      {hp && (
        <div className="chart-tooltip" style={{ left: x(hp.day), top: hp.value != null ? y(hp.value) : M.t + h / 2 }}>
          <strong>{dayPrefix}{hp.day}</strong>
          <br />
          {hp.value != null ? `${fmt(hp.value)} ${unit}` : 'missing'}
          {hp2 && hp2.value != null && (
            <>
              <br />
              {label2}: {fmt(hp2.value)} {unit}
            </>
          )}
        </div>
      )}
    </div>
  );
}
