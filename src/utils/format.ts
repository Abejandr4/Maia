const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const pad = (n: number) => String(n).padStart(2, '0');

/** "NOV 14, 14:41" */
export function stamp(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Nov 14" */
export function shortDate(d: Date) {
  const m = MONTHS[d.getMonth()];
  return `${m[0]}${m.slice(1).toLowerCase()} ${d.getDate()}`;
}

export const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function ageLabel(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 3) return 'now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export function signed(n: number, digits = 0) {
  const v = Number(n.toFixed(digits));
  if (v === 0) return (0).toFixed(digits);
  return v > 0 ? `+${v.toFixed(digits)}` : v.toFixed(digits);
}

export const hourOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
};
