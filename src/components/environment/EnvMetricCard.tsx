import type { Status } from '../../utils/types';
import StatusPill from '../ui/StatusPill';
import './environment.css';

interface EnvMetricCardProps {
  title: string;
  value: string;
  unit?: string;
  detail: string;
  status: Status;
  statusLabel?: string;
  compact?: boolean;
}

export default function EnvMetricCard({ title, value, unit, detail, status, statusLabel, compact }: EnvMetricCardProps) {
  return (
    <section className={`card env-metric ${compact ? 'env-metric--compact' : ''}`}>
      <header className="card__head">
        <h3 className="card__title">{title}</h3>
        <StatusPill status={status} label={statusLabel} size={compact ? 'sm' : 'md'} />
      </header>
      <div className="env-metric__value">
        {value}
        {unit && <span className="env-metric__unit">{unit}</span>}
      </div>
      <p className="env-metric__detail">{detail}</p>
    </section>
  );
}
