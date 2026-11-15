import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PageId } from '../../utils/types';
import { ASTRONAUT, TODAY_DAY, dayForDate } from '../../utils/mockData';
import { earth } from '../../data/maiaData';

const EARTH_TODAY = earth.days[earth.days.length - 1].day_after_landing;
import { contexts, type ContextRow } from '../../data/maiaData';
import { useVitals } from '../../utils/VitalsContext';
import { useNow } from '../../utils/hooks';
import Icon from '../ui/Icon';
import StatusPill from '../ui/StatusPill';
import './layout.css';

const NAV: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'body', label: 'Body & Sensors' },
  { id: 'environment', label: 'Environment' },
  { id: 'report', label: 'Reports' },
];

type LocationId = 'iss' | 'eva' | 'earth' | 'lunar' | 'mars';

const LOCATIONS: { id: LocationId; label: string; title: string; preview?: boolean; context: string }[] = [
  { id: 'iss', label: 'On the ISS', title: 'ISS health monitor', context: 'iss' },
  { id: 'eva', label: 'Spacewalk', title: 'Spacewalk monitor', context: 'spacewalk' },
  { id: 'earth', label: 'Back on Earth', title: 'Earth health monitor', context: 'back_on_earth' },
  { id: 'lunar', label: 'Lunar Surface', title: 'Lunar health monitor', preview: true, context: 'lunar_surface' },
  { id: 'mars', label: 'Mars Transit', title: 'Mars transit monitor', preview: true, context: 'mars_transit' },
];

const ctxOf = (id: string): ContextRow | undefined => contexts.find((c) => c.id === id);
const range = (a: number | null, b: number | null, unit: string) =>
  a == null ? '' : a === b || b == null ? `${a} ${unit}` : `${a}–${b} ${unit}`;
/** One line per location from contexts.csv: gravity · communication · daily radiation dose. */
function contextLine(c?: ContextRow) {
  if (!c) return '';
  const dose = range(c.daily_dose_msv_min, c.daily_dose_msv_max, 'mSv/day');
  return [c.gravity, c.comm_delay_label, dose].filter(Boolean).join(' · ');
}

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


export default function TopBar({ page, onNavigate, emergencySlot }: TopBarProps) {
  const { paused, evaMode, setEvaMode, alerts, place, setPlace } = useVitals();
  const now = useNow(15_000);
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

  const location: LocationId = evaMode ? 'eva' : place;
  const current = LOCATIONS.find((l) => l.id === location) ?? LOCATIONS[0];

  const chooseLocation = (id: LocationId) => {
    setOpenMenu(null);
    if (id === 'eva') {
      setEvaMode(true);
      return;
    }
    setPlace(id);
    setEvaMode(false);
  };

  // Alerts of the last 7 mission days: live sensor alerts + the alerts of the analysis.
  const recent = alerts
    .filter((a) => now - new Date(a.time).getTime() <= 7 * 24 * 3_600_000)
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  const urgent = recent.filter((a) => a.level !== 'advisory').length;
  const currentCtx = ctxOf(current.context);
  const clock = new Date(now).toISOString().slice(11, 16);

  return (
    <div className="topbar-wrap">
    <header className="topbar">
      <button type="button" className="topbar__brand" onClick={() => onNavigate('home')} aria-label="Maia, go to Home">
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
          {place === 'earth' && !evaMode ? `R+${EARTH_TODAY} after landing` : `Day ${TODAY_DAY}`} · {clock} GMT ·{' '}
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
                  <span className="topbar__loc-text">
                    <span>
                      {l.label}
                      {l.preview && <span className="topbar__tag">Preview</span>}
                    </span>
                    <span className="topbar__loc-meta">{contextLine(ctxOf(l.context))}</span>
                  </span>
                </button>
              ))}
              {currentCtx && (
                <div className="topbar__loc-about">
                  <p>{currentCtx.description}</p>
                  <p className="topbar__loc-meta">{currentCtx.comm_policy}</p>
                  <p className="topbar__loc-src">contexts.csv · {currentCtx.source}</p>
                </div>
              )}
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
              <p className="topbar__menu-title">Alerts · last 7 days</p>
              {recent.length === 0 ? (
                <p className="topbar__menu-empty">No alerts in the last 7 days.</p>
              ) : (
                <ul className="topbar__alerts">
                  {recent.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <div className="topbar__alert-head">
                        <StatusPill status={a.level} size="sm" />
                        <span className="topbar__alert-vital">{a.vital}</span>
                        <span className="topbar__alert-time">
                          D{dayForDate(new Date(a.time))} · {timeAgo(a.time, now)}
                        </span>
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
                  onNavigate('report');
                }}
              >
                See the evidence in Reports
                <Icon name="chevron" size={14} />
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
