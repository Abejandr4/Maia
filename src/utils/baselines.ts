import type { Metric, Range, Status, VitalEvaluation, VitalSample } from './types';

/** Learned from the astronaut's own data on mission days 1–14. */
export const PERSONAL_NORMAL: Record<Metric, Range> = {
  systolic: { min: 120, max: 126 },
  diastolic: { min: 76, max: 82 },
  hr: { min: 52, max: 68 },
  spo2: { min: 96, max: 99 },
  temp: { min: 36.3, max: 36.9 },
};

/** General adult reference ranges. */
export const GENERAL_REF: Record<Metric, Range> = {
  systolic: { min: 100, max: 130 },
  diastolic: { min: 60, max: 85 },
  hr: { min: 45, max: 90 },
  spo2: { min: 92, max: 100 },
  temp: { min: 35.5, max: 37.5 },
};

/** Outside these = critical. Between general ref and these = warning. */
export const SAFETY_LIMIT: Record<Metric, Range> = {
  systolic: { min: 85, max: 155 },
  diastolic: { min: 50, max: 98 },
  hr: { min: 40, max: 130 },
  spo2: { min: 89, max: 100 },
  temp: { min: 35, max: 39.5 },
};

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

export function classify(metric: Metric, value: number): Status {
  if (inRange(value, PERSONAL_NORMAL[metric])) return 'normal';
  if (inRange(value, GENERAL_REF[metric])) return 'caution';
  if (inRange(value, SAFETY_LIMIT[metric])) return 'warning';
  return 'critical';
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
