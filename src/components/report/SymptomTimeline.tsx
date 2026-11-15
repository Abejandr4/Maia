import type { SymptomEntry } from '../../utils/types';
import { stamp } from '../../utils/format';
import Card from '../ui/Card';
import './report.css';

interface SymptomTimelineProps {
  symptoms: SymptomEntry[];
  onAdd: () => void;
  limit?: number;
}

export default function SymptomTimeline({ symptoms, onAdd, limit = 6 }: SymptomTimelineProps) {
  const list = [...symptoms].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, limit);
  return (
    <Card
      className="log-card"
      title={<span className="log-card__title">Symptom log</span>}
      aside={
        <button type="button" className="link-btn" onClick={onAdd}>
          Add
        </button>
      }
    >
      <ul className="log-list">
        {list.map((s) => (
          <li key={s.id} className="log-item">
            <div className="log-item__main">
              <p className="log-item__title">{s.name}</p>
              {s.note && <p className="log-item__note">{s.note}</p>}
              <p className="log-item__time">{stamp(s.time)}</p>
            </div>
            <span className={`sev sev--${s.severity}`}>{s.severity}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
