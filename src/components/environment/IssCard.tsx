import type { IssPosition } from '../../utils/api';
import StatusPill from '../ui/StatusPill';
import './environment.css';

const W = 360;
const H = 180;
const x = (lon: number) => ((lon + 180) / 360) * W;
const y = (lat: number) => ((90 - lat) / 180) * H;

/** ISS ground position on a simple lat/lon grid, with the South Atlantic Anomaly marked. */
export default function IssCard({ iss, source }: { iss: IssPosition | null; source?: string }) {
  const hasPos = iss && iss.latitude != null && iss.longitude != null;
  return (
    <section className="card iss-card">
      <header className="card__head">
        <h3 className="card__title">ISS position</h3>
        {iss?.inSouthAtlanticAnomaly ? (
          <StatusPill status="advisory" label="In SAA" size="sm" />
        ) : (
          <StatusPill status="normal" label={iss?.visibility === 'eclipsed' ? 'Night side' : 'Day side'} size="sm" />
        )}
      </header>

      <svg viewBox={`0 0 ${W} ${H}`} className="iss-map" role="img" aria-label="ISS ground position">
        <rect width={W} height={H} className="iss-map__bg" />
        {[-60, -30, 0, 30, 60].map((lat) => (
          <line key={lat} x1={0} x2={W} y1={y(lat)} y2={y(lat)} className={lat === 0 ? 'iss-map__eq' : 'iss-map__grid'} />
        ))}
        {[-120, -60, 0, 60, 120].map((lon) => (
          <line key={lon} y1={0} y2={H} x1={x(lon)} x2={x(lon)} className="iss-map__grid" />
        ))}
        {/* ISS orbit band (51.6° inclination) */}
        <rect x={0} width={W} y={y(51.6)} height={y(-51.6) - y(51.6)} className="iss-map__band" />
        {/* South Atlantic Anomaly (approx.) */}
        <rect x={x(-90)} width={x(40) - x(-90)} y={y(0)} height={y(-50) - y(0)} rx={8} className="iss-map__saa" />
        <text x={x(-25)} y={y(-25)} textAnchor="middle" className="iss-map__saa-label">SAA</text>
        {hasPos && (
          <g transform={`translate(${x(iss.longitude!)} ${y(iss.latitude!)})`}>
            <circle r={10} className="iss-map__pulse" />
            <circle r={4.5} className="iss-map__dot" />
          </g>
        )}
      </svg>

      <div className="iss-stats mono">
        <span>{hasPos ? `${iss.latitude!.toFixed(1)}°, ${iss.longitude!.toFixed(1)}°` : '—'}</span>
        <span>{iss?.altitudeKm ? `${iss.altitudeKm.toFixed(0)} km` : '—'}</span>
        <span>{iss?.velocityKmh ? `${Math.round(iss.velocityKmh).toLocaleString()} km/h` : '—'}</span>
      </div>
      <p className="env-metric__detail">
        Crossing the South Atlantic Anomaly raises dose rate — the dose chart steps up on those passes.
        {source && source !== 'live' && ` · ${source} data`}
      </p>
    </section>
  );
}
