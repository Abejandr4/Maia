import { useEffect } from 'react';
import { useVitals } from '../../utils/VitalsContext';
import Icon from '../ui/Icon';
import './layout.css';

/** Shows the last spoken crew alert as on-screen text for 12 s. */
export default function AlertBanner() {
  const { lastSpoken, dismissSpoken } = useVitals();

  useEffect(() => {
    if (!lastSpoken) return;
    const id = window.setTimeout(dismissSpoken, 12_000);
    return () => window.clearTimeout(id);
  }, [lastSpoken, dismissSpoken]);

  if (!lastSpoken) return null;

  return (
    <div className={`alert-banner alert-banner--${lastSpoken.level}`} role="alert">
      <Icon name="volume" size={20} />
      <div className="alert-banner__body">
        <strong>Crew alert {lastSpoken.level === 'critical' ? '· critical' : ''}</strong>
        <p>“{lastSpoken.text}”</p>
      </div>
      <button type="button" className="btn btn--sm" onClick={dismissSpoken}>
        Dismiss
      </button>
    </div>
  );
}
