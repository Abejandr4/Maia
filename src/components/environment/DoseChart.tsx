import { useId, useState } from 'react';
import type { DayRecord } from '../../utils/types';
import { shortDate } from '../../utils/format';
import { useMeasure } from '../../utils/hooks';
import { niceStep, scaleLinear } from '../../utils/stats';
import './environment.css';

interface DoseChartProps {
  days: DayRecord[];
  solarDay?: number;
  evaDay?: number;
}

const H = 270;
const M = { t: 34, r: 16, b: 30, l: 40 };

/** Step chart of accumulated mission dose with event markers. */
export default function DoseChart({ days, solarDay, evaDay }: DoseChartProps) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = `dose-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const n = days.length;
  const w = Math.max(0, width - M.l - M.r);
  const h = H - M.t - M.b;
  const maxVal = days[n - 1]?.cumulativeDose ?? 1;
  const step = niceStep(maxVal / 2);
  const yMax = Math.ceil(maxVal / step) * step;
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const x = scaleLinear(0, n, M.l, M.l + w);
  const y = scaleLinear(0, yMax, M.t + h, M.t);

  let d = `M${x(0)},${y(0)}`;
  days.forEach((rec, i) => {
    d += `L${x(i).toFixed(1)},${y(rec.cumulativeDose).toFixed(1)}L${x(i + 1).toFixed(1)},${y(rec.cumulativeDose).toFixed(1)}`;
  });
  const area = `${d}L${x(n)},${y(0)}L${x(0)},${y(0)}Z`;
  const xTicks = [1, 7, 14, 21, 28, 35, 42].filter((t) => t <= n);

  const solar = solarDay ? days[solarDay - 1] : undefined;
  const hovered = hover ? days[hover - 1] : undefined;

  return (
    <div className="chart dose-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          onMouseMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const i = Math.floor(((px - M.l) / w) * n) + 1;
            setHover(i >= 1 && i <= n ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--normal)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--normal)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g className="chart-grid">
            {yTicks.map((t) => (
              <line key={t} x1={M.l} x2={M.l + w} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="chart-axis">
            {yTicks.map((t) => (
              <text key={t} x={M.l - 8} y={y(t) + 3.5} textAnchor="end">
                {t}
              </text>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t - 0.5)} y={M.t + h + 18} textAnchor="middle">
                D{t}
              </text>
            ))}
          </g>

          <path d={area} fill={`url(#${gid})`} />
          <path d={d} className="dose-chart__line" />

          {evaDay && (
            <text x={x(evaDay - 0.5)} y={M.t + h - 8} textAnchor="middle" className="dose-chart__eva">
              EVA
            </text>
          )}

          {solar && solarDay && (
            <g className="chart-event">
              <line x1={x(solarDay - 1)} x2={x(solarDay - 1)} y1={M.t - 22} y2={M.t + h} />
              <circle cx={x(solarDay - 1)} cy={y(solar.cumulativeDose - solar.dose)} r={4} className="dose-chart__event-dot" />
              <text x={x(solarDay - 1) + 6} y={M.t - 12}>
                Solar particle event (NASA DONKI)
              </text>
              <text x={x(solarDay - 1) + 6} y={M.t + 2} className="dose-chart__event-sub">
                +{(solar.dose - 2.6).toFixed(1)} mSv in one day
              </text>
            </g>
          )}

          {hovered && hover && (
            <g>
              <line x1={x(hover - 0.5)} x2={x(hover - 0.5)} y1={M.t} y2={M.t + h} className="chart-cursor" />
              <circle cx={x(hover - 0.5)} cy={y(hovered.cumulativeDose)} r={4} className="dose-chart__dot" />
            </g>
          )}
        </svg>
      )}
      {hovered && hover && (
        <div className="chart-tooltip" style={{ left: x(hover - 0.5), top: y(hovered.cumulativeDose) }}>
          <strong>
            D{hovered.day} · {shortDate(new Date(hovered.date))}
          </strong>
          <br />
          {hovered.dose.toFixed(2)} mSv that day
          <br />
          {hovered.cumulativeDose.toFixed(1)} mSv total
          {hovered.event && (
            <>
              <br />
              {hovered.event}
            </>
          )}
        </div>
      )}
    </div>
  );
}
