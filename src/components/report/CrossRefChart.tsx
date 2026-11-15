import { useState } from 'react';
import type { DayRecord, Range, SymptomEntry } from '../../utils/types';
import { shortDate } from '../../utils/format';
import { useMeasure } from '../../utils/hooks';
import { SERIES_META, type SeriesKey } from '../../utils/reportMeta';
import { extent, niceTicks, scaleLinear } from '../../utils/stats';
import './report.css';

interface CrossRefChartProps {
  days: DayRecord[];
  left: SeriesKey;
  right: SeriesKey;
  symptomsByDay: Map<number, SymptomEntry[]>;
  /** Personal normal band for the left series, if it's a vital. */
  band?: Range;
  events: { day: number; label: string }[];
  /** Shade from this day to the end (e.g. CO₂ above target). */
  shadeFrom?: number;
  shadeLabel?: string;
}

const H = 320;
const M = { t: 26, r: 56, b: 56, l: 56 };
const fmt = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0));

/** Dual-axis chart: one vital vs one context dataset, plus symptom markers. */
export default function CrossRefChart({ days, left, right, symptomsByDay, band, events, shadeFrom, shadeLabel }: CrossRefChartProps) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = days.length;
  const w = Math.max(0, width - M.l - M.r);
  const h = H - M.t - M.b;
  const lv = days.map((d) => d[left]);
  const rv = days.map((d) => d[right]);
  const [l0, l1] = extent(band ? [...lv, band.min, band.max] : lv, 0.12);
  const [r0, r1] = extent(rv, 0.12);

  const x = scaleLinear(1, n, M.l, M.l + w);
  const yl = scaleLinear(l0, l1, M.t + h, M.t);
  const yr = scaleLinear(r0, r1, M.t + h, M.t);
  const line = (vals: number[], y: (v: number) => number) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join('');

  const lTicks = niceTicks(l0, l1, 4);
  const rTicks = niceTicks(r0, r1, 4);
  const xTicks = [1, 7, 14, 21, 28, 35, 42].filter((t) => t <= n);
  const symY = M.t + h + 34;
  const lm = SERIES_META[left];
  const rm = SERIES_META[right];
  const hd = hover ? days[hover - 1] : undefined;
  const hs = hover ? symptomsByDay.get(hover) : undefined;

  return (
    <div className="chart xref-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const d = Math.round(((px - M.l) / w) * (n - 1)) + 1;
            setHover(d >= 1 && d <= n ? d : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {shadeFrom && (
            <g>
              <rect x={x(shadeFrom)} y={M.t} width={x(n) - x(shadeFrom)} height={h} className="chart-shade" />
              {shadeLabel && (
                <text x={x(shadeFrom) + 6} y={M.t + h - 8} className="xref-chart__shade-label">
                  {shadeLabel}
                </text>
              )}
            </g>
          )}
          {band && <rect x={M.l} width={w} y={yl(band.max)} height={Math.max(0, yl(band.min) - yl(band.max))} className="chart-band" />}

          <g className="chart-grid">
            {lTicks.map((t) => (
              <line key={t} x1={M.l} x2={M.l + w} y1={yl(t)} y2={yl(t)} />
            ))}
          </g>

          <g className="chart-axis">
            {lTicks.map((t) => (
              <text key={`l${t}`} x={M.l - 8} y={yl(t) + 3.5} textAnchor="end" className="xref-chart__tick--a">
                {fmt(t)}
              </text>
            ))}
            {rTicks.map((t) => (
              <text key={`r${t}`} x={M.l + w + 8} y={yr(t) + 3.5} textAnchor="start" className="xref-chart__tick--b">
                {fmt(t)}
              </text>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y={M.t + h + 16} textAnchor="middle">
                D{t}
              </text>
            ))}
            <text x={M.l - 8} y={symY + 3.5} textAnchor="end">
              Sx
            </text>
          </g>

          {events.map((ev) => (
            <g key={ev.label} className="chart-event">
              <line x1={x(ev.day)} x2={x(ev.day)} y1={M.t} y2={M.t + h} />
              <text x={x(ev.day) + 4} y={M.t + 10}>
                {ev.label}
              </text>
            </g>
          ))}

          <path d={line(rv, yr)} className="xref-line xref-line--b" />
          <path d={line(lv, yl)} className="xref-line xref-line--a" />

          <line x1={M.l} x2={M.l + w} y1={symY} y2={symY} className="xref-chart__sym-axis" />
          {days.map((d) => {
            const s = symptomsByDay.get(d.day);
            if (!s) return null;
            const sev = s.some((e) => e.severity === 'severe') ? 'severe' : s.some((e) => e.severity === 'moderate') ? 'moderate' : 'mild';
            return <circle key={d.day} cx={x(d.day)} cy={symY} r={3 + Math.min(s.length, 3) * 1.2} className={`sym-dot sym-dot--${sev}`} />;
          })}

          {hd && hover && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={symY} className="chart-cursor" />
              <circle cx={x(hover)} cy={yl(hd[left])} r={4} className="xref-dot xref-dot--a" />
              <circle cx={x(hover)} cy={yr(hd[right])} r={4} className="xref-dot xref-dot--b" />
            </g>
          )}
        </svg>
      )}

      {hd && hover && (
        <div className="chart-tooltip" style={{ left: Math.min(Math.max(x(hover), 90), width - 90), top: M.t + 10 }}>
          <strong>
            D{hd.day} · {shortDate(new Date(hd.date))}
          </strong>
          <br />
          <span className="xref-chart__tick--a">■</span> {lm.short} {hd[left].toFixed(lm.digits)} {lm.unit}
          <br />
          <span className="xref-chart__tick--b">■</span> {rm.short} {hd[right].toFixed(rm.digits)} {rm.unit}
          {hs && (
            <>
              <br />
              Sx: {hs.map((s) => s.name).join(', ')}
            </>
          )}
          {hd.event && (
            <>
              <br />
              {hd.event}
            </>
          )}
        </div>
      )}
    </div>
  );
}
