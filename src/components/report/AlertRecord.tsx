import { useState } from 'react';
import type { AlertEntry } from '../../utils/types';
import { stamp } from '../../utils/format';
import Card from '../ui/Card';
import SegmentedTabs from '../ui/SegmentedTabs';
import './report.css';

type Filter = 'all' | 'warning' | 'critical';

export default function AlertRecord({ alerts, limit = 8 }: { alerts: AlertEntry[]; limit?: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const list = alerts.filter((a) => filter === 'all' || a.level === filter).slice(0, limit);

  return (
    <Card
      className="log-card"
      title={<span className="log-card__title">Alert record</span>}
      aside={
        <SegmentedTabs<Filter>
          ariaLabel="Filter alerts"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' },
          ]}
        />
      }
    >
      {list.length === 0 && <p className="muted">No alerts at this level.</p>}
      <ul className="log-list">
        {list.map((a) => (
          <li key={a.id} className="log-item">
            <div className="log-item__main">
              <p className="log-item__title">{a.vital}</p>
              <p className="log-item__note">{a.message}</p>
              {a.source === 'simulated' && <p className="log-item__tag">simulated</p>}
            </div>
            <div className="log-item__side">
              <span className={`level level--${a.level}`}>{a.level}</span>
              <span className="log-item__time">{stamp(a.time)}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
