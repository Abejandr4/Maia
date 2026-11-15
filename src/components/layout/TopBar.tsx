import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PageId } from '../../utils/types';
import { ASTRONAUT, TODAY_DAY } from '../../utils/mockData';
import { useVitals } from '../../utils/VitalsContext';
import { useNow } from '../../utils/hooks';
import Icon from '../ui/Icon';
import StatusPill from '../ui/StatusPill';
import './layout.css';

const NAV: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'body', label: 'Body & Sensors' },
  { id: 'environment', label: 'Environment' },
  { id: 'routine', label: 'Routine' },
  { id: 'report', label: 'Reports' },
];

type LocationId = 'iss' | 'eva' | 'earth' | 'lunar' | 'mars';

const LOCATIONS: { id: LocationId; label: string; title: string; preview?: boolean }[] = [
  { id: 'iss', label: 'On the ISS', title: 'ISS health monitor' },
  { id: 'eva', label: 'Spacewalk', title: 'Spacewalk monitor' },
  { id: 'earth', label: 'Back on Earth', title: 'Earth health monitor' },
  { id: 'lunar', label: 'Lunar Surface', title: 'Lunar health monitor', preview: true },
  { id: 'mars', label: 'Mars Transit', title: 'Mars transit monitor', preview: true },
];

type MenuId = 'location' | 'alerts' | 'settings';

interface TopBarProps {
  page: PageId;
  onNavigate: (p: PageId) => void;
  onLogSymptom: () => void;
  /** Drop your emergency button component in here. */
  emergencySlot?: ReactNode;
}

function timeAgo(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** Small round asteroid face used as the app logo. */
function Logo() {
  return (
    <svg className="topbar__logo" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#fff" stroke="var(--border)" />
      <path
        d="M10 26c-1-8 4-15 12-16 8-1 16 3 17 11 1 8-5 15-13 16-8 1-15-3-16-11z"
        fill="#d4cfde"
        stroke="#b8b1c8"
        strokeWidth="1.5"
      />
      <circle cx="19" cy="25" r="1.8" fill="#1e1a1c" />
      <circle cx="29" cy="25" r="1.8" fill="#1e1a1c" />
      <path d="M21 30c1.6 1.4 4.4 1.4 6 0" fill="none" stroke="#1e1a1c" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function TopBar({ page, onNavigate, onLogSymptom, emergencySlot }: TopBarProps) {
  const { paused, voiceOn, setVoiceOn, evaMode, setEvaMode, alerts } = useVitals();
  const now = useNow(15_000);
  const [baseLocation, setBaseLocation] = useState<LocationId>('iss');
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [navHidden, setNavHidden] = useState(false);

  // Hide the navigation pill while scrolling down; bring it back on scroll up or at the top.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40) setNavHidden(false);
      else if (y > last + 8) setNavHidden(true);
      else if (y < last - 8) setNavHidden(false);
      if (Math.abs(y - last) > 8) last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close any open menu on outside click or Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!actionsRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const toggle = (m: MenuId) => setOpenMenu((cur) => (cur === m ? null : m));

  const location: LocationId = evaMode ? 'eva' : baseLocation;
  const current = LOCATIONS.find((l) => l.id === location) ?? LOCATIONS[0];

  const chooseLocation = (id: LocationId) => {
    setOpenMenu(null);
    if (id === 'eva') {
      setEvaMode(true);
      return;
    }
    setBaseLocation(id);
    setEvaMode(false);
  };

  // Alerts that still need a look: warning or critical in the last 24 h.
  const recent = alerts.filter((a) => now - new Date(a.time).getTime() <= 24 * 3_600_000);
  const urgent = recent.filter((a) => a.level === 'warning' || a.level === 'critical').length;
  const clock = new Date(now).toISOString().slice(11, 16);

  return (
    <div className="topbar-wrap">
    <header className="topbar">
      <button type="button" className="topbar__brand" onClick={() => onNavigate('home')} aria-label="Maia, go to Home">
        <Logo />
        <span className="topbar__brand-text">
          <span className="topbar__name">Maia</span>
          <span className="topbar__sub">
            {current.title}
            {current.preview ? ' · preview' : ''}
          </span>
        </span>
      </button>

      <div className="topbar__person" title="Sample crew profile">
        <span className="topbar__person-name">
          {ASTRONAUT.fullName}<span className="topbar__role"> · {ASTRONAUT.role}</span>
        </span>
        <span className="topbar__person-meta">
          Day {TODAY_DAY} · {clock} GMT ·{' '}
          <span className="topbar__live">
            <i className={`topbar__live-dot ${paused ? 'is-paused' : ''}`} aria-hidden="true" />
            {paused ? 'Sensor paused' : 'Sensor live'}
          </span>
        </span>
      </div>

      <div className="topbar__actions" ref={actionsRef}>
        {/* Location */}
        <div className="topbar__menu-wrap">
          <button
            type="button"
            className="topbar__location"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'location'}
            onClick={() => toggle('location')}
          >
            <Icon name="pin" size={16} />
            {current.label}
            <Icon name="chevronDown" size={14} />
          </button>
          {openMenu === 'location' && (
            <div className="topbar__menu" role="menu" aria-label="Location">
              {LOCATIONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.id === location}
                  className={`topbar__menu-item ${l.id === location ? 'is-current' : ''}`}
                  onClick={() => chooseLocation(l.id)}
                >
                  <span className="topbar__menu-check">{l.id === location && <Icon name="check" size={14} strokeWidth={2.5} />}</span>
                  {l.label}
                  {l.preview && <span className="topbar__tag">Preview</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="topbar__menu-wrap">
          <button
            type="button"
            className="topbar__icon"
            aria-haspopup="dialog"
            aria-expanded={openMenu === 'alerts'}
            aria-label={`Alerts, ${urgent} need attention`}
            onClick={() => toggle('alerts')}
          >
            <Icon name="bell" size={19} />
            {urgent > 0 && <span className="topbar__badge">{urgent > 9 ? '9+' : urgent}</span>}
          </button>
          {openMenu === 'alerts' && (
            <div className="topbar__menu topbar__menu--wide" role="dialog" aria-label="Alerts">
              <p className="topbar__menu-title">Alerts · last 24 h</p>
              {recent.length === 0 ? (
                <p className="topbar__menu-empty">No alerts in the last 24 hours.</p>
              ) : (
                <ul className="topbar__alerts">
                  {recent.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <div className="topbar__alert-head">
                        <StatusPill status={a.level} size="sm" />
                        <span className="topbar__alert-vital">{a.vital}</span>
                        <span className="topbar__alert-time">{timeAgo(a.time, now)}</span>
                      </div>
                      <p>{a.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="topbar__menu-link"
                onClick={() => {
                  setOpenMenu(null);
                  onNavigate('body');
                }}
              >
                See the evidence in Body &amp; Sensors
                <Icon name="chevron" size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="topbar__menu-wrap">
          <button
            type="button"
            className="topbar__icon"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'settings'}
            aria-label="Settings"
            onClick={() => toggle('settings')}
          >
            <Icon name="gear" size={19} />
          </button>
          {openMenu === 'settings' && (
            <div className="topbar__menu" role="menu" aria-label="Settings">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={voiceOn}
                className="topbar__menu-item"
                onClick={() => setVoiceOn(!voiceOn)}
              >
                <span className="topbar__menu-check">
                  <Icon name={voiceOn ? 'volume' : 'volumeOff'} size={15} />
                </span>
                Voice alerts: {voiceOn ? 'on' : 'muted'}
              </button>
              <button
                type="button"
                role="menuitem"
                className="topbar__menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  onLogSymptom();
                }}
              >
                <span className="topbar__menu-check">
                  <Icon name="pencil" size={15} />
                </span>
                Log a symptom
              </button>
            </div>
          )}
        </div>

        {emergencySlot}
      </div>
    </header>

    <nav className={`topbar__nav ${navHidden ? 'is-hidden' : ''}`} aria-label="Main">
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
    </div>
  );
}
