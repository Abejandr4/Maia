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
