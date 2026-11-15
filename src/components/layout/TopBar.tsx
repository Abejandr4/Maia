import type { ReactNode } from 'react';
import type { PageId } from '../../utils/types';
import { TODAY_DAY } from '../../utils/mockData';
import { useVitals } from '../../utils/VitalsContext';
import Icon from '../ui/Icon';
import './layout.css';

const NAV: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'body', label: 'Body & Sensors' },
  { id: 'environment', label: 'Environment' },
  { id: 'report', label: 'Report' },
];

interface TopBarProps {
  page: PageId;
  onNavigate: (p: PageId) => void;
  onLogSymptom: () => void;
  /** Drop your emergency button component in here. */
  emergencySlot?: ReactNode;
}

export default function TopBar({ page, onNavigate, onLogSymptom, emergencySlot }: TopBarProps) {
  const { overall, voiceOn, setVoiceOn, evaMode } = useVitals();

  return (
    <header className="topbar">
      <button type="button" className="topbar__brand" onClick={() => onNavigate('home')}>
        <span className={`topbar__dot topbar__dot--${overall}`} aria-hidden="true" />
        <span className="topbar__name">Crew Health</span>
        <span className="topbar__day">DAY {TODAY_DAY}</span>
      </button>

      <nav className="topbar__nav" aria-label="Main">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`topbar__link ${page === n.id ? 'is-active' : ''}`}
            aria-current={page === n.id ? 'page' : undefined}
            onClick={() => onNavigate(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <div className="topbar__actions">
        {evaMode && <span className="eva-chip">EVA</span>}
        <button
          type="button"
          className="icon-btn"
          onClick={() => setVoiceOn(!voiceOn)}
          aria-label={voiceOn ? 'Mute voice alerts' : 'Unmute voice alerts'}
          title={voiceOn ? 'Voice alerts on' : 'Voice alerts muted'}
        >
          <Icon name={voiceOn ? 'volume' : 'volumeOff'} />
        </button>
        <button type="button" className="btn btn--primary" onClick={onLogSymptom}>
          <Icon name="pencil" />
          Log symptom
        </button>
        {emergencySlot}
      </div>
    </header>
  );
}
