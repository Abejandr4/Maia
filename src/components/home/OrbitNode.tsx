import type { Status } from '../../utils/types';
import StatusPill from '../ui/StatusPill';
import './home.css';

interface OrbitNodeProps {
  label: string;
  value: string;
  unit?: string;
  status: Status;
  statusLabel: string;
  caption?: string;
  size?: 'md' | 'lg';
  /** Draws the thick status ring (use for the node that needs attention). */
  ring?: boolean;
  position: 'env' | 'reports' | 'body' | 'routine' | 'place';
  onClick: () => void;
}

export default function OrbitNode({ label, value, unit, status, statusLabel, caption, size = 'md', ring, position, onClick }: OrbitNodeProps) {
  return (
    <button
      type="button"
      className={`orbit-node orbit-node--${size} orbit-node--${position} ${ring ? `orbit-node--ring orbit-node--ring-${status}` : ''}`}
      onClick={onClick}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ''}, ${statusLabel}`}
    >
      <span className="orbit-node__label">{label}</span>
      <span className="orbit-node__value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <StatusPill status={status} label={statusLabel} size="sm" />
      {caption && <span className="orbit-node__caption">{caption}</span>}
    </button>
  );
}
