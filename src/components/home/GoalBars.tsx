import Icon, { type IconName } from '../ui/Icon';
import './home.css';

export interface Goal {
  key: string;
  label: string;
  icon: IconName;
  value: number;
  target: number;
  unit: string;
  color: string;
}

export default function GoalBars({ goals }: { goals: Goal[] }) {
  return (
    <section className="card">
      <h3 className="card__title">Today’s goals</h3>
      <div className="goals">
        {goals.map((g) => (
          <div key={g.key} className="goal">
            <div className="goal__row">
              <span className="goal__label">
                <Icon name={g.icon} size={14} style={{ color: g.color }} />
                {g.label}
              </span>
              <span className="goal__val">
                {g.value.toFixed(1)} / {g.target.toFixed(1)} {g.unit}
              </span>
            </div>
            <div className="progress progress--lg">
              <div className="progress__bar" style={{ width: `${Math.min(100, (g.value / g.target) * 100)}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
