import type { Metric, Range, Status, VitalEvaluation, VitalSample } from './types';

import { daily } from '../data/maiaData';

/* Ranges come from the analysis (src/data/generated/maia_daily.json):
 *  - PERSONAL_NORMAL = personal band, median ± 2.5 robust SD learned on flight days 8–21 (guide 3.1)
 *  - GENERAL_REF     = green reference range of measurement_ranges.csv (ISS)
 *  - SAFETY_LIMIT    = red limits of measurement_ranges.csv; past them the emergency card opens
 * When the CSV has no green limit on one side, the red limit is used on that side.
 */
const KEY: Record<Metric, string> = { systolic: 'bp_systolic', diastolic: 'bp_diastolic', hr: 'heart_rate', spo2: 'spo2', temp: 'temperature' };
const METRICS = Object.keys(KEY) as Metric[];
const num = (v: number | null | undefined, fallback: number) => (v == null || !Number.isFinite(v) ? fallback : v);

export const PERSONAL_NORMAL: Record<Metric, Range> = Object.fromEntries(
  METRICS.map((m) => {
    const b = daily.bands[KEY[m]];
    return [m, { min: num(b?.low, -Infinity), max: num(b?.high, Infinity) }];
  }),
) as Record<Metric, Range>;

export const SAFETY_LIMIT: Record<Metric, Range> = Object.fromEntries(
  METRICS.map((m) => {
    const r = daily.reference[KEY[m]];
    return [m, { min: num(r?.red_below, -Infinity), max: num(r?.red_above, Infinity) }];
  }),
) as Record<Metric, Range>;

export const GENERAL_REF: Record<Metric, Range> = Object.fromEntries(
  METRICS.map((m) => {
    const r = daily.reference[KEY[m]];
    return [m, { min: num(r?.green_min, SAFETY_LIMIT[m].min), max: num(r?.green_max, SAFETY_LIMIT[m].max) }];
  }),
) as Record<Metric, Range>;

export const STATUS_RANK: Record<Status, number> = {
  normal: 0,
  advisory: 1,
  caution: 2,
  warning: 3,
  critical: 4,
};

export const STATUS_LABEL: Record<Status, string> = {
  normal: 'Normal',
  advisory: 'Advisory',
  caution: 'Caution',
  warning: 'Warning',
  critical: 'Critical',
};

export const inRange = (v: number, r: Range) => v >= r.min && v <= r.max;
export const mid = (r: Range) => (r.min + r.max) / 2;

export function rangeText(r: Range, digits = 0) {
  return `${r.min.toFixed(digits)}–${r.max.toFixed(digits)}`;
}

/**
 * One live reading:
 *  red limit passed            → critical (emergency card, spoken alert)
 *  outside the green reference → caution
 *  outside your personal band  → advisory (one reading is never a marked change: that needs 4 of 6 days)
 *  otherwise                   → normal
 */
export function classify(metric: Metric, value: number): Status {
  if (!inRange(value, SAFETY_LIMIT[metric])) return 'critical';
  if (!inRange(value, GENERAL_REF[metric])) return 'caution';
  // high SpO₂ is never a concern: only the low side counts
  if (metric === 'spo2' && value > PERSONAL_NORMAL.spo2.max) return 'normal';
  if (!inRange(value, PERSONAL_NORMAL[metric])) return 'advisory';
  return 'normal';
}

export function worstStatus(list: Status[]): Status {
  return list.reduce<Status>((w, s) => (STATUS_RANK[s] > STATUS_RANK[w] ? s : w), 'normal');
}

export function roundSample(s: VitalSample): VitalSample {
  return {
    t: s.t,
    systolic: Math.round(s.systolic),
    diastolic: Math.round(s.diastolic),
    hr: Math.round(s.hr),
    spo2: Math.min(100, Math.round(s.spo2)),
    temp: Math.round(s.temp * 10) / 10,
  };
}

export function evaluateSample(raw: VitalSample): VitalEvaluation[] {
  const s = roundSample(raw);
  return [
    {
      key: 'bp',
      label: 'Blood pressure',
      status: worstStatus([classify('systolic', s.systolic), classify('diastolic', s.diastolic)]),
      valueText: `${s.systolic}/${s.diastolic}`,
      unit: 'mmHg',
      deviation: s.systolic - mid(PERSONAL_NORMAL.systolic),
    },
    {
      key: 'hr',
      label: 'Heart rate',
      status: classify('hr', s.hr),
      valueText: `${s.hr}`,
      unit: 'bpm',
      deviation: s.hr - mid(PERSONAL_NORMAL.hr),
    },
    {
      key: 'spo2',
      label: 'SpO₂',
      status: classify('spo2', s.spo2),
      valueText: `${s.spo2}`,
      unit: '%',
      deviation: s.spo2 - mid(PERSONAL_NORMAL.spo2),
    },
    {
      key: 'temp',
      label: 'Core temperature',
      status: classify('temp', s.temp),
      valueText: s.temp.toFixed(1),
      unit: '°C',
      deviation: Math.round((s.temp - mid(PERSONAL_NORMAL.temp)) * 10) / 10,
    },
  ];
}
