import type {
  AlertEntry,
  BodyZone,
  DayRecord,
  RoutineBlock,
  RoutineTask,
  Status,
  SymptomEntry,
  VitalSample,
} from './types';

/* ------------------------------------------------------------------ */
/* Mission clock — "today" is always mission day 42 so the demo stays */
/* fresh whatever date you present it on.                             */
/* ------------------------------------------------------------------ */

export const ASTRONAUT = { name: 'Ana' };
export const TODAY_DAY = 42;
export const EVENTS = { eva: 18, solar: 30, co2Rise: 34 };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const MISSION_START = (() => {
  const d = startOfToday();
  d.setDate(d.getDate() - (TODAY_DAY - 1));
  return d;
})();

export function dateForDay(day: number) {
  const d = new Date(MISSION_START);
  d.setDate(d.getDate() + day - 1);
  return d;
}

export function dayForDate(date: Date) {
  const a = new Date(date);
  a.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - MISSION_START.getTime()) / 86_400_000) + 1;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/* Deterministic random so charts look the same on every reload. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/* ------------------------------------------------------------------ */
/* 42 days of daily records: vitals + environment + habits            */
/* ------------------------------------------------------------------ */

export const MISSION_DAYS: DayRecord[] = (() => {
  const rng = mulberry32(2026);
  const j = (amp: number) => (rng() - 0.5) * 2 * amp;
  const out: DayRecord[] = [];
  let cum = 0;

  for (let day = 1; day <= TODAY_DAY; day++) {
    const co2High = day >= EVENTS.co2Rise;
    const co2 = round(co2High ? 2.25 + (day - EVENTS.co2Rise) * 0.02 + j(0.15) : 1.55 + j(0.2), 2);
    const dose = round(
      2.6 + j(0.12) + (day === EVENTS.solar ? 2.1 : 0) + (day === EVENTS.eva ? 0.45 : 0),
      2,
    );
    cum += dose;
    const sleep = round(7 + j(0.5) - (co2High ? 0.5 : 0) - (day === EVENTS.solar + 1 ? 0.9 : 0), 1);
    const drift = day >= 36 ? (day - 35) * 1.1 : 0;

    out.push({
      day,
      date: dateForDay(day).toISOString(),
      systolic: Math.round(122 + j(2.5) + drift + (co2High ? 1.5 : 0)),
      diastolic: Math.round(78 + j(2) + drift * 0.8),
      hr: Math.round(60 + j(4) + (day === EVENTS.eva ? 6 : 0) + (7 - sleep) * 1.5),
      spo2: Math.min(99, Math.round(98 + j(0.8))),
      temp: round(36.6 + j(0.15) + (day === EVENTS.solar + 1 ? 0.3 : 0), 1),
      co2,
      dose,
      cumulativeDose: round(cum, 1),
      sleep,
      water: round(2.3 + j(0.35) - (day >= 38 ? 0.4 : 0), 1),
      exercise: round(2.2 + j(0.35), 1),
      event: day === EVENTS.eva ? 'EVA' : day === EVENTS.solar ? 'Solar particle event' : undefined,
    });
  }

  // This morning's vitals came in high → triggers the 15:00 re-check.
  out[out.length - 1] = { ...out[out.length - 1], systolic: 133, diastolic: 84 };
  return out;
})();

/** Morning measurement flagged for a re-check (shown on Home). */
export const MORNING_FLAG = {
  metric: 'systolic' as const,
  value: 133,
  at: '07:14',
  status: 'caution' as Status,
  recheckAt: '15:00',
};

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

export const ENVIRONMENT = {
  careerLimit: 600,
  priorDose: 2.0,
  todayDose: 0.5,
  todayHoursInLab: 5.5,
  dailyPlanning: 2.5,
  spaceWeather: {
    level: 'Quiet',
    detail: 'No solar particle event forecast in the next 48 h',
    source: 'DONKI 14:00 GMT',
  },
  co2: { value: 2.4, target: 2.0, since: EVENTS.co2Rise },
  cabin: [
    { label: 'ppO₂', value: '21.3', unit: 'kPa', ref: 'ref 19.5–23.1', status: 'normal' as Status },
    { label: 'Humidity', value: '47', unit: '%', ref: 'ref 25–70', status: 'normal' as Status },
    { label: 'Cabin temp', value: '22.4', unit: '°C', ref: 'ref 18–27', status: 'normal' as Status },
    { label: 'Noise', value: '61', unit: 'dBA', ref: 'sleep target ≤ 50', status: 'advisory' as Status },
  ],
};

/* ------------------------------------------------------------------ */
/* Symptoms & alerts                                                   */
/* ------------------------------------------------------------------ */

export const INITIAL_SYMPTOMS: SymptomEntry[] = [
  { id: 's1', name: 'Nausea', severity: 'mild', time: hoursAgo(2.9) },
  { id: 's2', name: 'Dizziness', severity: 'mild', time: hoursAgo(3) },
  {
    id: 's3',
    name: 'Fatigue',
    severity: 'mild',
    note: 'Lower energy than usual during the second exercise block.',
    time: hoursAgo(19.9),
  },
  {
    id: 's4',
    name: 'Headache',
    severity: 'mild',
    note: 'Mild frontal headache in the afternoon, improved with hydration and a 20 minute rest.',
    time: hoursAgo(31.9),
  },
  {
    id: 's5',
    name: 'Dizziness',
    severity: 'moderate',
    note: 'Light-headed standing up after the EVA suit donning drill; resolved within a few minutes seated.',
    time: hoursAgo(53.5),
  },
  {
    id: 's6',
    name: 'Headache',
    severity: 'mild',
    note: 'Dull headache after a long session in the lab module.',
    time: hoursAgo(24 * 7 + 6),
  },
  {
    id: 's7',
    name: 'Headache',
    severity: 'moderate',
    note: 'Pressure behind the eyes, eased by the evening.',
    time: hoursAgo(24 * 8 + 3),
  },
  {
    id: 's8',
    name: 'Fatigue',
    severity: 'moderate',
    note: 'Poor sleep the night after sheltering for the solar particle event.',
    time: hoursAgo(24 * 11 + 10),
  },
  {
    id: 's9',
    name: 'Lower back pain',
    severity: 'mild',
    note: 'Stiffness after the EVA; stretching helped.',
    time: hoursAgo(24 * 23 + 8),
  },
  {
    id: 's10',
    name: 'Congestion',
    severity: 'mild',
    note: 'Facial fullness, typical early fluid shift.',
    time: hoursAgo(24 * 38),
  },
];

export const INITIAL_ALERTS: AlertEntry[] = [
  { id: 'a1', vital: 'Blood Pressure', message: 'Blood pressure 156/98 mmHg — above the safe range for microgravity.', level: 'warning', time: hoursAgo(1.2), source: 'sensor' },
  { id: 'a2', vital: 'Blood Pressure', message: 'Morning reading 133/84 mmHg — +10 mmHg above your normal. Re-check scheduled 15:00.', level: 'advisory', time: hoursAgo(7.3), source: 'system' },
  { id: 'a3', vital: 'Heart Rate', message: 'Heart rate 112 bpm at rest for 4 minutes.', level: 'warning', time: hoursAgo(9.5), source: 'sensor' },
  { id: 'a4', vital: 'Cabin CO₂', message: 'Cabin CO₂ 2.6 mmHg — above the 2.0 mmHg target.', level: 'advisory', time: hoursAgo(14), source: 'system' },
  { id: 'a5', vital: 'SpO₂', message: 'SpO₂ 93 % — below your normal during the exercise block.', level: 'advisory', time: hoursAgo(21), source: 'sensor' },
  { id: 'a6', vital: 'Blood Pressure', message: 'Blood pressure 149/95 mmHg after waking.', level: 'warning', time: hoursAgo(30), source: 'sensor' },
  { id: 'a7', vital: 'Core Temperature', message: 'Core temperature 37.7 °C after exercise; back to normal in 25 min.', level: 'advisory', time: hoursAgo(50), source: 'sensor' },
  { id: 'a8', vital: 'Radiation', message: 'Solar particle event — shelter in shielded quarters. +2.1 mSv today.', level: 'critical', time: hoursAgo(24 * 12 + 5), source: 'system' },
  { id: 'a9', vital: 'Heart Rate', message: 'Heart rate 138 bpm during EVA translation.', level: 'warning', time: hoursAgo(24 * 24 + 4), source: 'sensor' },
];

/** 248 sensor samples across the last 7 days (for "time in nominal range"). */
export const WEEK_SAMPLES: VitalSample[] = (() => {
  const r = mulberry32(7);
  const n = 248;
  const span = 7 * 86_400_000;
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const spike = r() < 0.09;
    return {
      t: now - span + (span * i) / (n - 1),
      systolic: 123 + (r() - 0.5) * 5 + (spike ? 18 + r() * 15 : 0),
      diastolic: 79 + (r() - 0.5) * 4 + (spike ? 12 : 0),
      hr: 60 + (r() - 0.5) * 12,
      spo2: 98 + (r() - 0.5) * 1.6,
      temp: 36.6 + (r() - 0.5) * 0.4,
    };
  });
})();

/* ------------------------------------------------------------------ */
/* Routine                                                             */
/* ------------------------------------------------------------------ */

export const ROUTINE_BLOCKS: RoutineBlock[] = [
  { label: 'Sleep', start: 22, end: 6, kind: 'sleep' },
  { label: 'Exercise', start: 10.5, end: 12.5, kind: 'exercise' },
  { label: 'Highest fatigue', start: 14, end: 16, kind: 'fatigue' },
];

export const ROUTINE_TASKS: RoutineTask[] = [
  { id: 't1', time: '07:10', label: 'Morning vitals', state: 'done', doneAt: '07:14', target: 'body' },
  { id: 't2', time: '08:00', label: 'Water · 500 ml', state: 'done', doneAt: '08:05', target: 'home' },
  { id: 't3', time: '15:00', label: 'Blood pressure re-check', state: 'next', target: 'body' },
  { id: 't4', time: '18:00', label: 'Send report to flight surgeon', state: 'scheduled', target: 'report' },
  { id: 't5', time: '21:00', label: 'Evening check-in', state: 'scheduled', target: 'body' },
];

export const GOALS = {
  water: { value: 1.5, target: 2.5, unit: 'L', lastDrinkHoursAgo: 3 },
  exercise: { value: 2.0, target: 2.5, unit: 'h' },
  sleepAvg: 6.4,
};

export const FAMILY_MESSAGES = [
  {
    id: 'f1',
    from: 'Leo',
    text: 'We watched the station pass over tonight! The kids waved. Sleep well up there.',
    time: hoursAgo(1.5),
    unread: true,
  },
  {
    id: 'f2',
    from: 'Mom',
    text: 'Remember to drink your water :) Love you.',
    time: hoursAgo(26),
    unread: false,
  },
];

/* ------------------------------------------------------------------ */
/* Body map — 10 sensor zones                                          */
/* ------------------------------------------------------------------ */

export const BODY_ZONES: BodyZone[] = [
  { id: 1, name: 'Forehead', sensor: 'Skin temperature patch', about: 'Tracks skin temperature and sweat — early sign of fever or overheating in the suit.', x: 103, y: 22, status: 'normal', reading: '34.1 °C skin', note: 'Within your normal.' },
  { id: 2, name: 'Neck', sensor: 'Carotid PPG', about: 'Pulse wave at the carotid. Fluid shift toward the head shows up here first.', x: 101, y: 44, status: 'normal', reading: 'Pulse transit 212 ms', note: 'Stable over 7 days.' },
  { id: 3, name: 'Ear', sensor: 'In-ear core thermometer', about: 'Best estimate of core body temperature; also used for vestibular symptom logging.', x: 124, y: 54, status: 'normal', reading: '36.6 °C core', note: 'Within your normal.' },
  { id: 4, name: 'Chest · heart', sensor: 'ECG lead + BP reference', about: 'Heart rhythm and pressure. Microgravity shifts fluid and can change cardiac load.', x: 86, y: 92, status: 'caution', reading: 'Systolic +10 mmHg', note: 'Morning BP above your normal. Re-check at 15:00.' },
  { id: 5, name: 'Chest · lungs', sensor: 'Respiration belt + SpO₂ relay', about: 'Breathing rate and oxygen saturation. CO₂ build-up raises breathing rate.', x: 116, y: 88, status: 'normal', reading: '14 breaths/min', note: 'Normal pattern.' },
  { id: 6, name: 'Abdomen', sensor: 'Bio-impedance (hydration)', about: 'Estimates body water — dehydration is common in the first weeks of flight.', x: 92, y: 126, status: 'normal', reading: 'TBW 54 %', note: 'Slightly low hydration trend.' },
  { id: 7, name: 'Lower back', sensor: 'Posture IMU', about: 'Spine elongates in microgravity; this tracks posture and back strain.', x: 120, y: 132, status: 'advisory', reading: 'Spine +1.8 cm', note: 'Do the stretch block after exercise.' },
  { id: 8, name: 'Wrist', sensor: 'Optical HR + SpO₂', about: 'Main heart rate and blood oxygen sensor; backup when the chest strap is off.', x: 53, y: 128, status: 'normal', reading: '60 bpm · 98 %', note: 'Good contact.' },
  { id: 9, name: 'Thigh', sensor: 'EMG + bone loading', about: 'Muscle activity and loading during exercise — protects against bone and muscle loss.', x: 83, y: 228, status: 'advisory', reading: 'Load 71 % of target', note: 'Add 10 min of resistive exercise.' },
  { id: 10, name: 'Calf', sensor: 'Leg circumference band', about: '"Bird legs": fluid leaves the legs in microgravity. Tracks the shift over time.', x: 117, y: 264, status: 'normal', reading: '−6 % vs pre-flight', note: 'Expected for day 42.' },
];
