// Shared types for the symptom log + guided camera feature.

export type Severity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const SYMPTOM_OPTIONS = [
  'Nausea',
  'Vomiting',
  'Dizziness / vertigo',
  'Headache',
  'Muscle soreness',
  'Back pain',
  'Joint pain',
  'Fatigue',
  'Nasal congestion',
  'Vision changes',
  'Skin rash / irritation',
  'Bruising',
  'Trouble sleeping',
  'Low mood / anxiety',
  'Other',
] as const;

export type SymptomName = (typeof SYMPTOM_OPTIONS)[number];

export interface SymptomEntry {
  id: string;
  name: SymptomName;
  customName?: string;   // used when name === 'Other'
  severity: Severity;    // 0 = none, 10 = worst imaginable
  onset: string;         // ISO timestamp of when it started
  bodyLocation?: string; // e.g. "left forearm"
  notes?: string;
}

/** Quality numbers measured on the frame the photo was taken from.
 *  Sent along with the photo so the clinician knows how reliable it is. */
export interface FrameMetrics {
  brightness: number;   // 0–255 mean luma
  glare: number;        // fraction of near-white pixels (0–1)
  darkness: number;     // fraction of near-black pixels (0–1)
  sharpness: number;    // variance of Laplacian (higher = sharper)
  motion: number;       // mean abs difference vs previous frame (0–255)
  skinCoverage: number; // fraction of frame that looks like skin (0–1)
  centerSkin: number;   // fraction of the centre box that looks like skin (0–1)
}

export type GuidanceLevel = 'good' | 'adjust' | 'bad';

export interface Guidance {
  level: GuidanceLevel;
  code:
    | 'ok'
    | 'too_dark'
    | 'glare'
    | 'motion'
    | 'too_far'
    | 'off_center'
    | 'too_close'
    | 'blurry'
    | 'starting';
  message: string;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;      // JPEG data URL
  width: number;
  height: number;
  takenAt: string;      // ISO timestamp
  bodyLocation?: string;
  caption?: string;
  metrics: FrameMetrics;
  guidanceAtCapture: Guidance['code']; // 'ok' unless the user overrode guidance
}

export type SensorKind =
  | 'heart_rate'
  | 'blood_pressure'
  | 'spo2'
  | 'body_temperature'
  | 'blood_glucose'
  | 'respiratory_rate'
  | 'sleep_hours';

export type IndicatorStatus = 'normal' | 'caution' | 'warning' | 'advisory';

export interface SensorReading {
  kind: SensorKind;
  label: string;        // "Heart rate"
  value: number | string; // string allows "118/76" for BP
  unit: string;         // "bpm", "mmHg", "°C" ...
  timestamp: string;    // ISO
  status?: IndicatorStatus;
}

export interface CrewMember {
  id: string;
  name: string;
  mission: string;
}

/** The full payload sent to the flight surgeon. */
export interface SymptomReport {
  schemaVersion: 1;
  reportId: string;
  createdAt: string;
  crew: CrewMember;
  symptoms: SymptomEntry[];
  generalNotes?: string;
  photos: CapturedPhoto[];
  sensorSnapshot: SensorReading[];
}
