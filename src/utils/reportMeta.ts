import type { SymptomEntry } from './types';
import { dayForDate } from './mockData';

export type SeriesKey =
  | 'systolic'
  | 'diastolic'
  | 'hr'
  | 'spo2'
  | 'temp'
  | 'co2'
  | 'dose'
  | 'sleep'
  | 'water'
  | 'exercise';

export const SERIES_META: Record<SeriesKey, { label: string; short: string; unit: string; digits: number }> = {
  systolic: { label: 'Systolic pressure', short: 'SYS', unit: 'mmHg', digits: 0 },
  diastolic: { label: 'Diastolic pressure', short: 'DIA', unit: 'mmHg', digits: 0 },
  hr: { label: 'Heart rate', short: 'HR', unit: 'bpm', digits: 0 },
  spo2: { label: 'Blood oxygen', short: 'SpO₂', unit: '%', digits: 0 },
  temp: { label: 'Core temperature', short: 'TEMP', unit: '°C', digits: 1 },
  co2: { label: 'Cabin CO₂', short: 'CO₂', unit: 'mmHg', digits: 2 },
  dose: { label: 'Daily radiation dose', short: 'DOSE', unit: 'mSv', digits: 2 },
  sleep: { label: 'Sleep', short: 'SLEEP', unit: 'h', digits: 1 },
  water: { label: 'Water intake', short: 'H₂O', unit: 'L', digits: 1 },
  exercise: { label: 'Exercise', short: 'EXER', unit: 'h', digits: 1 },
};

export const VITAL_SERIES: SeriesKey[] = ['systolic', 'diastolic', 'hr', 'spo2', 'temp'];
export const CONTEXT_SERIES: SeriesKey[] = ['co2', 'dose', 'sleep', 'water', 'exercise'];
export const ALL_SERIES: SeriesKey[] = [...VITAL_SERIES, ...CONTEXT_SERIES];

export function groupSymptomsByDay(list: SymptomEntry[]) {
  const map = new Map<number, SymptomEntry[]>();
  for (const s of list) {
    const d = dayForDate(new Date(s.time));
    const arr = map.get(d) ?? [];
    arr.push(s);
    map.set(d, arr);
  }
  return map;
}
