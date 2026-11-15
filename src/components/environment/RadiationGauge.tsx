import './environment.css';

interface RadiationGaugeProps {
  value: number;
  limit: number;
}

const W = 320;
const CX = 160;
const CY = 172;
const R = 130;

function arc(from: number, to: number) {
  // fractions 0..1 along the top semicircle, left → right
  const p = (f: number) => {
    const a = Math.PI * (1 - f);
    return [CX + R * Math.cos(a), CY - R * Math.sin(a)];
  };
  const [x0, y0] = p(from);
  const [x1, y1] = p(to);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export default function RadiationGauge({ value, limit }: RadiationGaugeProps) {
  const pct = Math.min(1, Math.max(0, value / limit));
  const color = pct < 0.5 ? 'var(--normal)' : pct < 0.8 ? 'var(--caution)' : 'var(--critical)';

  return (
    <svg viewBox={`0 0 ${W} 200`} className="gauge" role="img" aria-label={`Career dose ${value.toFixed(1)} of ${limit} millisievert`}>
      <path d={arc(0, 0.9999)} className="gauge__track" />
      {pct > 0 && <path d={arc(0, Math.max(pct, 0.004))} className="gauge__value" style={{ stroke: color }} />}
      <line x1={CX} x2={CX} y1={CY - R - 14} y2={CY - R + 14} className="gauge__mid" />
      <text x={CX} y={CY - R - 22} textAnchor="middle" className="gauge__tick">
        {limit / 2}
      </text>
      <text x={CX - R} y={CY + 26} textAnchor="middle" className="gauge__tick">
        0
      </text>
      <text x={CX + R} y={CY + 26} textAnchor="middle" className="gauge__tick">
        {limit}
      </text>
      <text x={CX} y={CY - 26} textAnchor="middle" className="gauge__big">
        {value.toFixed(1)}
      </text>
      <text x={CX} y={CY - 2} textAnchor="middle" className="gauge__sub">
        mSv · {Math.round(pct * 100)} % of {limit}
      </text>
    </svg>
  );
}
