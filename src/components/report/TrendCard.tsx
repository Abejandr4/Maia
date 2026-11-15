import { signed } from '../../utils/format';
import Icon from '../ui/Icon';
import Sparkline from '../ui/Sparkline';
import './report.css';

interface TrendCardProps {
  label: string;
  unit: string;
  today: number;
  avg: number;
  series: number[];
  digits?: number;
  /** Which direction of change is a concern. */
  badDirection: 'up' | 'down' | 'both';
  /** Minimum absolute change before it's highlighted. */
  threshold: number;
}

export default function TrendCard({ label, unit, today, avg, series, digits = 0, badDirection, threshold }: TrendCardProps) {
  const delta = today - avg;
  const flat = Math.abs(delta) < 10 ** -digits / 2;
  const bad =
    Math.abs(delta) >= threshold && (badDirection === 'both' || (badDirection === 'up' ? delta > 0 : delta < 0));

  return (
    <section className={`trend ${bad ? 'is-bad' : ''}`}>
      <p className="stat-tile__label">{label}</p>
      <p className="trend__value">
        {today.toFixed(digits)} <span>{unit}</span>
      </p>
      <p className="trend__delta">
        <Icon name={flat ? 'arrowFlat' : delta > 0 ? 'arrowUp' : 'arrowDown'} size={14} />
        <b>
          {signed(delta, digits)} {unit}
        </b>
        <span>vs 7-day avg</span>
      </p>
      <Sparkline values={series} height={36} fill={false} className="trend__spark" />
    </section>
  );
}
