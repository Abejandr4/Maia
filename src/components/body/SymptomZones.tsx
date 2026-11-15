import { useMemo, useState } from 'react';
import type { BodyZone, Status } from '../../utils/types';
import { BODY_ZONES } from '../../utils/mockData';
import { stamp } from '../../utils/format';
import { useVitals } from '../../utils/VitalsContext';
import Card from '../ui/Card';
import BodyMap from './BodyMap';
import './body.css';

/** Which body zone each symptom belongs to. Unknown symptoms fall back to the chest. */
const ZONE_FOR: Record<string, number> = {
  Headache: 1,
  Congestion: 2,
  Dizziness: 3,
  Nausea: 6,
  Fatigue: 5,
  'Lower back pain': 7,
  'Back pain': 7,
  'Muscle soreness': 9,
  'Leg cramp': 10,
  'Eye strain': 1,
};

const WEEK = 7 * 86_400_000;

export default function SymptomZones({ onLogSymptom }: { onLogSymptom: () => void }) {
  const { symptoms } = useVitals();
  const [selected, setSelected] = useState<number | null>(null);

  const recent = useMemo(() => {
    const now = Date.now();
    return symptoms.filter((s) => now - Date.parse(s.time) <= WEEK);
  }, [symptoms]);

  const zones: BodyZone[] = useMemo(
    () =>
      BODY_ZONES.map((z) => {
        const hits = recent.filter((s) => (ZONE_FOR[s.name] ?? 4) === z.id);
        const status: Status = hits.some((h) => h.severity === 'severe')
          ? 'warning'
          : hits.some((h) => h.severity === 'moderate')
            ? 'caution'
            : hits.length
              ? 'advisory'
              : 'normal';
        return { ...z, status };
      }),
    [recent],
  );

  const list = selected ? recent.filter((s) => (ZONE_FOR[s.name] ?? 4) === selected) : recent;
  const zoneName = selected ? BODY_ZONES.find((z) => z.id === selected)?.name : null;

  return (
    <div className="symptom-zones">
      <Card title="Where you felt it · last 7 days" aside={<span>tap a zone to filter</span>}>
        <BodyMap
          zones={zones}
          selected={selected}
          onSelect={(id) => setSelected(selected === id ? null : id)}
          legend={[
            { status: 'normal', label: 'None' },
            { status: 'advisory', label: 'Mild' },
            { status: 'caution', label: 'Moderate' },
            { status: 'warning', label: 'Severe' },
          ]}
        />
      </Card>
      <Card
        title={zoneName ? `Symptoms · ${zoneName}` : 'All symptoms · last 7 days'}
        aside={
          <button type="button" className="link-btn" onClick={onLogSymptom}>
            Log symptom
          </button>
        }
      >
        {list.length === 0 && <p className="muted">Nothing logged here in the last 7 days.</p>}
        <ul className="zone-symptoms">
          {list.map((s) => (
            <li key={s.id}>
              <span className="zone-symptoms__zone">{ZONE_FOR[s.name] ?? 4}</span>
              <div>
                <strong>{s.name}</strong> <span className={`sev sev--${s.severity}`}>{s.severity}</span>
                {s.note && <p className="small muted">{s.note}</p>}
              </div>
              <span className="mono small muted">{stamp(s.time)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
