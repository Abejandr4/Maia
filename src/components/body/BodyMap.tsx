import type { BodyZone, Status } from '../../utils/types';
import './body.css';

interface BodyMapProps {
  zones: BodyZone[];
  selected: number | null;
  onSelect: (id: number) => void;
  legend?: { status: Status; label: string }[];
}

const DEFAULT_LEGEND: { status: Status; label: string }[] = [
  { status: 'normal', label: 'Normal' },
  { status: 'caution', label: 'Caution' },
  { status: 'advisory', label: 'Advisory' },
];

export default function BodyMap({ zones, selected, onSelect, legend = DEFAULT_LEGEND }: BodyMapProps) {
  return (
    <div className="bodymap">
      <svg viewBox="0 0 200 330" className="bodymap__svg" role="group" aria-label="Body sensor map">
        <g className="bodymap__silhouette">
          <circle cx={100} cy={30} r={20} />
          <rect x={91} y={46} width={18} height={16} rx={4} />
          <rect x={64} y={58} width={72} height={118} rx={20} />
          <rect x={44} y={64} width={18} height={112} rx={9} />
          <rect x={138} y={64} width={18} height={112} rx={9} />
          <rect x={70} y={164} width={27} height={150} rx={11} />
          <rect x={103} y={164} width={27} height={150} rx={11} />
        </g>

        {zones.map((z) => (
          <g
            key={z.id}
            className={`zone zone--${z.status} ${selected === z.id ? 'is-selected' : ''}`}
            transform={`translate(${z.x} ${z.y})`}
            onClick={() => onSelect(z.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(z.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={selected === z.id}
            aria-label={`Zone ${z.id}: ${z.name}, ${z.status}`}
          >
            {(z.status === 'caution' || z.status === 'warning' || z.status === 'critical') && (
              <circle r={10} className="zone__pulse" />
            )}
            <circle r={10} className="zone__ring" />
            <text dy="3" textAnchor="middle" className="zone__num">
              {z.id}
            </text>
          </g>
        ))}
      </svg>

      <div className="bodymap__legend">
        {legend.map((l) => (
          <span key={l.status}>
            <i className="legend-dot" style={{ background: `var(--${l.status})` }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
