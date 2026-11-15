import type { ReactNode } from 'react';
import { Mascot } from '../external';
import './home.css';

interface HabitBubbleProps {
  title: string;
  message: string;
  progress?: { value: number; target: number; unit: string; meta?: string };
  action?: ReactNode;
  pointer?: boolean;
  /** Si se pasa, muestra una "X" en la esquina para descartar la burbuja. */
  onDismiss?: () => void;
}

export default function HabitBubble({ title, message, progress, action, pointer = true, onDismiss }: HabitBubbleProps) {
  const pct = progress ? Math.min(100, (progress.value / progress.target) * 100) : 0;
  return (
    <div className={`habit-bubble ${pointer ? 'habit-bubble--pointer' : ''}`}>
      {onDismiss && (
  <button type="button" className="habit-bubble__close" onClick={onDismiss} aria-label="Dismiss message">
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  </button>
)}
      <div className="habit-bubble__head">
        <Mascot size={34} />
        <div>
          <p className="habit-bubble__title">{title}</p>
          <p className="habit-bubble__msg">{message}</p>
        </div>
      </div>
      {progress && (
        <div className="habit-bubble__progress">
          <div className="habit-bubble__row">
            <span className="mono">
              {progress.value.toFixed(1)} of {progress.target.toFixed(1)} {progress.unit}
            </span>
            {progress.meta && <span className="muted small">{progress.meta}</span>}
          </div>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {action && <div className="habit-bubble__action">{action}</div>}
    </div>
  );
}
