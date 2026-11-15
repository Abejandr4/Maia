import type { Range } from '../../utils/types';
import './ui.css';

interface SparklineProps {
  values: number[];
  height?: number;
  min?: number;
  max?: number;
  fill?: boolean;
  /** Shaded band, e.g. the personal normal range. */
  band?: Range;
  className?: string;
}

export default function Sparkline({ values, height = 48, min, max, fill = true, band, className = '' }: SparklineProps) {
  if (values.length < 2) return <svg className={`sparkline ${className}`} style={{ height }} />;

  let lo = min ?? Math.min(...values);
  let hi = max ?? Math.max(...values);
  if (band) {
    lo = Math.min(lo, band.min);
    hi = Math.max(hi, band.max);
  }
  if (hi - lo < 1e-6) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;

  const x = (i: number) => (i / (values.length - 1)) * 100;
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join('');

  return (
    <svg
      className={`sparkline ${className}`}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden="true"
    >
      {band && <rect className="sparkline__band" x={0} width={100} y={y(band.max)} height={y(band.min) - y(band.max)} />}
      {fill && <path className="sparkline__fill" d={`${d}L100,${height}L0,${height}Z`} />}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
