import type { BodyZone } from '../../utils/types';
import StatusPill from '../ui/StatusPill';
import './body.css';

export default function ZoneDetail({ zone }: { zone: BodyZone | undefined }) {
  if (!zone) return <p className="zone-detail muted small">Tap a zone to see its sensor and what it tells you.</p>;
  return (
    <div className="zone-detail">
      <div className="zone-detail__head">
        <span className="zone-detail__id">{zone.id}</span>
        <div>
          <strong>{zone.name}</strong>
          <span className="muted small"> · {zone.sensor}</span>
        </div>
        <StatusPill status={zone.status} size="sm" />
      </div>
      <p className="zone-detail__reading mono">{zone.reading}</p>
      <p className="small">{zone.note}</p>
      <p className="small muted">{zone.about}</p>
    </div>
  );
}
