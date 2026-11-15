import type { CSSProperties } from 'react';

const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 3.5 21.5 20h-19L12 3.5z M12 10v4.5 M12 17.2v.3',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z M12 11v5.5 M12 7.6v.3',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  pause: 'M9 5v14 M15 5v14',
  play: 'M7 5l12 7-12 7V5z',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7 M4 4v5h5',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  x: 'M6 6l12 12 M18 6 6 18',
  volume: 'M4 9.5v5h3.5L12 18V6L7.5 9.5H4z M15.5 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  volumeOff: 'M4 9.5v5h3.5L12 18V6L7.5 9.5H4z M16 9.5l5 5 M21 9.5l-5 5',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4',
  droplet: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
  arrowUp: 'M7 17 17 7 M9 7h8v8',
  arrowDown: 'M7 7l10 10 M17 9v8H9',
  arrowFlat: 'M5 12h14 M13 6l6 6-6 6',
  message: 'M4 5h16v11H9l-5 4V5z',
  send: 'M4 12 20 4l-6 16-3-7-7-1z',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z M10 20.5a2 2 0 0 0 4 0',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  siren: 'M7 18v-6a5 5 0 0 1 10 0v6 M5 18h14v3H5z M12 2.5v2 M4 6l1.5 1.5 M20 6l-1.5 1.5 M2.5 12h2 M19.5 12h2',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Icon({ name, size = 16, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
