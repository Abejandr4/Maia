import type { RoutineTask } from '../../utils/types';
import Icon from '../ui/Icon';
import StatusPill from '../ui/StatusPill';
import './home.css';

interface TaskListProps {
  tasks: RoutineTask[];
  onOpen: (t: RoutineTask) => void;
}

export default function TaskList({ tasks, onOpen }: TaskListProps) {
  const next = tasks.find((t) => t.state === 'next');
  return (
    <section className="card task-card">
      <header className="task-card__head">
        <h3>Today’s tasks</h3>
        {next && (
          <span className="muted small">
            next: {next.time} {next.label.toLowerCase()}
          </span>
        )}
      </header>
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id}>
            <button type="button" className={`task-row ${t.state === 'next' ? 'is-next' : ''}`} onClick={() => onOpen(t)}>
              <span className="task-row__time">{t.time}</span>
              <span className="task-row__label">{t.label}</span>
              {t.state === 'done' && (
                <span className="task-state task-state--done">
                  <Icon name="check" size={13} strokeWidth={2.5} /> Done {t.doneAt}
                </span>
              )}
              {t.state === 'next' && <StatusPill status="caution" label="Next" size="sm" />}
              {t.state === 'scheduled' && <span className="task-state task-state--scheduled">Scheduled</span>}
              <Icon name="chevron" size={14} className="task-row__chev" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
