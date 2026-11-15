export type Status = 'normal' | 'advisory' | 'caution' | 'warning' | 'critical';
export type PageId = 'home' | 'body' | 'environment' | 'report';
export type Scenario = 'nominal' | 'hypertension' | 'tachycardia' | 'hypoxia' | 'fever';
export type VitalKey = 'bp' | 'hr' | 'spo2' | 'temp';
export type Metric = 'systolic' | 'diastolic' | 'hr' | 'spo2' | 'temp';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface Range {
  min: number;
  max: number;
}

export interface VitalSample {
  t: number;
  systolic: number;
  diastolic: number;
  hr: number;
  spo2: number;
  temp: number;
}

export interface VitalEvaluation {
  key: VitalKey;
  label: string;
  status: Status;
  valueText: string;
  unit: string;
  /** Distance from the middle of the personal normal range (systolic for BP). */
  deviation: number;
}

export interface SymptomPhoto {
  dataUrl: string; // JPEG data URL from the guided camera
  takenAt: string; // ISO
  bodyLocation?: string;
  caption?: string;
}

export interface SymptomEntry {
  id: string;
  name: string;
  severity: Severity;
  note?: string;
  time: string; // ISO
  /** Photos taken with the guided camera for this report (optional). */
  photos?: SymptomPhoto[];
}

export interface AlertEntry {
  id: string;
  vital: string;
  message: string;
  level: 'advisory' | 'caution' | 'warning' | 'critical';
  time: string; // ISO
  source: 'sensor' | 'simulated' | 'system';
}

export interface DayRecord {
  day: number;
  date: string; // ISO
  systolic: number;
  diastolic: number;
  hr: number;
  spo2: number;
  temp: number;
  co2: number;
  dose: number;
  cumulativeDose: number;
  sleep: number;
  water: number;
  exercise: number;
  event?: string;
}

export interface RoutineTask {
  id: string;
  time: string; // HH:MM
  label: string;
  state: 'done' | 'next' | 'scheduled';
  doneAt?: string;
  target: PageId;
  /** Its time has passed and it is not marked done yet. */
  overdue?: boolean;
}

export interface RoutineBlock {
  label: string;
  start: number; // hour, 0-24 (decimals allowed)
  end: number;
  kind: 'sleep' | 'exercise' | 'fatigue';
}

export interface BodyZone {
  id: number;
  name: string;
  sensor: string;
  about: string;
  x: number;
  y: number;
  status: Status;
  reading: string;
  note: string;
}
