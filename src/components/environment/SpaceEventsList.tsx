import type { SpaceEvent } from '../../utils/api';
import { stamp } from '../../utils/format';
import Sparkline from '../ui/Sparkline';
import StatusPill from '../ui/StatusPill';
import './environment.css';

interface Props {
  events: SpaceEvent[];
  kpSeries: { time: string; kp: number }[];
  kp: number | null;
}

const TYPE_LABEL: Record<SpaceEvent['type'], string> = { SEP: 'Particles', FLR: 'Flare', GST: 'Geomag.' };

/** Last 30 days of DONKI events + NOAA Kp trend. */
export default function SpaceEventsList({ events, kpSeries, kp }: Props) {
  return (
    <section className="card space-events">
      <header className="card__head">
        <h3 className="card__title">Solar activity · last 30 days</h3>
        <span className="card__aside">NASA DONKI</span>
      </header>

      <div className="space-events__kp">
        <div>
          <p className="env-metric__detail">Planetary Kp · NOAA</p>
          <p className="env-metric__value">
            {kp != null ? kp.toFixed(1) : '—'}
            <span className="env-metric__unit">/ 9</span>
          </p>
        </div>
        <Sparkline values={kpSeries.map((k) => k.kp)} min={0} max={9} height={40} className="space-events__spark" />
      </div>

      {events.length === 0 && <p className="env-metric__detail">No flares, particle events or storms reported.</p>}
      <ul className="space-events__list">
        {events.map((e) => (
          <li key={e.id}>
            <span className={`space-events__type space-events__type--${e.type}`}>{TYPE_LABEL[e.type]}</span>
            <div>
              <p>{e.title}</p>
              <p className="env-metric__detail">
                {stamp(e.time)}
                {e.detail ? ` · ${e.detail}` : ''}
              </p>
            </div>
            <StatusPill status={e.status} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}
