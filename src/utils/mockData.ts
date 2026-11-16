import type {
  AlertEntry,
  BodyZone,
  DayRecord,
  Metric,
  RoutineBlock,
  RoutineTask,
  Status,
  SymptomEntry,
  VitalSample,
} from './types';
import { REPORT_DAY, alerts as maiaAlerts, daily, routine, targets, upTo } from '../data/maiaData';

/*
 * Every value below comes from the data analysis (src/data/generated/*.json, made by
 * analysis/code/step9_export_for_app.py) or from the team CSV files. Daily vital signs are
 * SAMPLE data (generator of guide section 6); nothing here is typed in by hand.
 */

/* ------------------------------------------------------------------ */
/* Mission clock — "today" is the report day of the analysis (day 42)  */
/* ------------------------------------------------------------------ */

/** Reads the name typed on the About You page (falls back to the demo name). */
interface SavedProfile {
  fullName?: string;
  crewRole?: string;
}

/** Reads what the user typed on the About You page. */
function savedProfile(): SavedProfile {
  try {
    const raw = localStorage.getItem('userProfile');
    return raw ? (JSON.parse(raw) as SavedProfile) : {};
  } catch {
    return {};
  }
}

export const ASTRONAUT = {
  /** Full name, for reports */
  get fullName() {
    return savedProfile().fullName?.trim() || 'Ana Ruiz';
  },
  /** First name, for greetings ("Hi, Ana") */
  get name() {
    return this.fullName.split(/\s+/)[0];
  },
  /** Crew role from About You */
  get role() {
    return savedProfile().crewRole?.trim() || 'Flight Engineer';
  },
};

export const TODAY_DAY = REPORT_DAY;

const eventDay = (id: string) => daily.events.find((e) => e.id === id)?.day ?? NaN;
/** Mission events of the demo storyline (guide section 6). co2Rise = cabin CO₂ peak. */
export const EVENTS = { eva: eventDay('eva'), solar: eventDay('solar_event'), co2Rise: eventDay('co2_peak'), scheduleShift: eventDay('schedule_shift') };

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


/** ISO time of a mission day at a given hour (for alerts and symptoms of the analysis). */
const atDay = (day: number, hour = 9) => {
  const d = dateForDay(day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/* ------------------------------------------------------------------ */
/* Daily records from the analysis                                     */
/* ------------------------------------------------------------------ */

const SERIES: Record<Metric | 'sleep', string> = {
  systolic: 'bp_systolic',
  diastolic: 'bp_diastolic',
  hr: 'heart_rate',
  spo2: 'spo2',
  temp: 'temperature',
  sleep: 'sleep',
};
/** Value of one measurement on one day; NaN when the day is missing (never filled in). */
export const valueOn = (m: Metric | 'sleep', day: number) =>
  daily.series[SERIES[m]]?.find((p) => p.day === day)?.value ?? NaN;

export const CAREER_LIMIT_MSV = 600; // NASA-STD-3001 [V1 4030]
const radPct = new Map(daily.radiation_pct_of_career_limit.map((r) => [r.day, r.value]));
const doseOn = (day: number) => (((radPct.get(day) ?? NaN) - (radPct.get(day - 1) ?? NaN)) / 100) * CAREER_LIMIT_MSV;
const firstPct = daily.radiation_pct_of_career_limit[0]?.value ?? 0;
const DAILY_DOSE = ((daily.radiation_pct_of_career_limit[1]?.value ?? firstPct) - firstPct) / 100 * CAREER_LIMIT_MSV;
const PRIOR_PCT = firstPct - (DAILY_DOSE / CAREER_LIMIT_MSV) * 100;

const EVENT_NAME: Record<string, string> = {
  solar_event: 'Solar particle event (replay)',
  schedule_shift: 'Schedule shift',
  eva: 'EVA',
  co2_peak: 'Cabin CO₂ peak',
};

/** One record per mission day up to today. Missing days stay NaN (water and exercise have no data). */
export const MISSION_DAYS: DayRecord[] = Array.from({ length: TODAY_DAY }, (_, i) => {
  const day = i + 1;
  const ev = daily.events.find((e) => e.kind === 'event' && e.day === day);
  return {
    day,
    date: dateForDay(day).toISOString(),
    systolic: valueOn('systolic', day),
    diastolic: valueOn('diastolic', day),
    hr: valueOn('hr', day),
    spo2: valueOn('spo2', day),
    temp: valueOn('temp', day),
    co2: daily.cabin_co2.find((c) => c.day === day)?.mean ?? NaN,
    dose: day === 1 ? DAILY_DOSE : doseOn(day),
    cumulativeDose: (((radPct.get(day) ?? NaN) - PRIOR_PCT) / 100) * CAREER_LIMIT_MSV,
    sleep: valueOn('sleep', day),
    water: NaN,
    exercise: NaN,
    event: ev ? EVENT_NAME[ev.id] ?? ev.description : undefined,
  };
});

/** Today's reading that is outside the personal band (shown on Home); null when all are inside. */
export const MORNING_FLAG = (() => {
  for (const m of ['systolic', 'diastolic', 'hr', 'spo2', 'temp'] as const) {
    const p = daily.series[SERIES[m]]?.find((q) => q.day === TODAY_DAY);
    if (p && p.value != null && (p.side === 'high' || p.side === 'low')) {
      return { metric: m, value: p.value, at: '06:30', status: 'advisory' as Status, recheckAt: 'tomorrow 06:30' };
    }
  }
  return null;
})();

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

const co2Today = daily.cabin_co2.find((c) => c.day === TODAY_DAY);
export const ENVIRONMENT = {
  careerLimit: CAREER_LIMIT_MSV,
  careerPct: radPct.get(TODAY_DAY) ?? NaN,
  careerMsv: ((radPct.get(TODAY_DAY) ?? NaN) / 100) * CAREER_LIMIT_MSV,
  todayDose: DAILY_DOSE,
  co2: { value: co2Today?.mean ?? NaN, mean7d: co2Today?.mean_7d ?? NaN, limit7d: daily.reference.cabin_co2?.green_max ?? NaN },
};

/* ------------------------------------------------------------------ */
/* Symptoms & alerts of the analysis                                   */
/* ------------------------------------------------------------------ */

const SYMPTOM_NAME: Record<string, string> = { rash: 'Rash', headache: 'Headache' };
export const INITIAL_SYMPTOMS: SymptomEntry[] = upTo(daily.events.filter((e) => e.kind === 'symptom'))
  .map((e) => ({
    id: `maia-${e.id}-${e.day}`,
    name: SYMPTOM_NAME[e.id] ?? e.id,
    severity: 'mild' as const, // severity is not in the data: shown as mild, note says so
    note: `${e.description}`,
    time: atDay(e.day, 10),
  }))
  .reverse();

/** Names used by the alert filters of Body & Sensors (Trends) and the top bar. */
const ALERT_VITAL: Record<string, string> = {
  heart_rate: 'Heart Rate',
  bp_systolic: 'Blood Pressure',
  bp_diastolic: 'Blood Pressure',
  'blood pressure': 'Blood Pressure',
  spo2: 'SpO₂',
  temperature: 'Core Temperature',
  sleep: 'Sleep',
  immune: 'Immune',
  '': 'Mission event',
};
const LEVEL: Record<string, AlertEntry['level']> = { advisory: 'advisory', caution: 'caution', warning: 'warning', critical: 'critical' };
export const INITIAL_ALERTS: AlertEntry[] = upTo(maiaAlerts).map((a, i) => ({
  id: `maia-${a.alert_id}-${a.day}-${i}`,
  vital: ALERT_VITAL[a.measurement] ?? a.title,
  message: `${a.title}. ${a.text}`,
  level: LEVEL[a.level] ?? 'advisory',
  time: atDay(a.day),
  source: 'system' as const,
}));

/** One sample per day for the last 7 days (morning check), only days with all four signals. */
export const WEEK_SAMPLES: VitalSample[] = MISSION_DAYS.slice(-7)
  .filter((d) => [d.systolic, d.diastolic, d.hr, d.spo2, d.temp].every(Number.isFinite))
  .map((d) => {
    const t = dateForDay(d.day);
    t.setHours(6, 30, 0, 0);
    return { t: t.getTime(), systolic: d.systolic, diastolic: d.diastolic, hr: d.hr, spo2: d.spo2, temp: d.temp };
  });

/* ------------------------------------------------------------------ */
/* Routine (daily_routine.csv) and goals (targets.csv)                 */
/* ------------------------------------------------------------------ */

const hour = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h + (m || 0) / 60;
};
const issRoutine = routine.filter((r) => r.location === 'iss' && /^\d{2}:\d{2}$/.test(r.time));
const wake = issRoutine.find((r) => r.type === 'sleep' && /wake/i.test(r.task));
const sleepStart = issRoutine.find((r) => r.type === 'sleep' && /begins/i.test(r.task));
const exercise = issRoutine.find((r) => r.type === 'exercise');
const fatigue = routine.find((r) => r.type === 'fatigue');
const fatigueHours = fatigue?.time.match(/(\d{2}):(\d{2})\D+(\d{2}):(\d{2})/);
const exerciseTarget = targets.find((t) => t.goal === 'exercise_per_day')?.value ?? NaN;

export const ROUTINE_BLOCKS: RoutineBlock[] = [
  ...(sleepStart && wake ? [{ label: 'Sleep', start: hour(sleepStart.time), end: hour(wake.time), kind: 'sleep' as const }] : []),
  ...(exercise ? [{ label: 'Exercise', start: hour(exercise.time), end: hour(exercise.time) + exerciseTarget, kind: 'exercise' as const }] : []),
  ...(fatigueHours
    ? [{ label: 'Fatigue hours', start: +fatigueHours[1] + +fatigueHours[2] / 60, end: +fatigueHours[3] + +fatigueHours[4] / 60, kind: 'fatigue' as const }]
    : []),
];

const TARGET: Record<string, RoutineTask['target']> = { measurement: 'body', symptoms: 'body', water: 'home', exercise: 'home', sleep: 'home' };
const shortTask = (t: string) => t.replace(/\s*\(task[^)]*\)/i, '').replace(/:.*$/, (m) => (m.length > 40 ? '' : m));

/** Tasks of today: earlier than now = done, the first later one = next. */
export const ROUTINE_TASKS: RoutineTask[] = (() => {
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  let nextGiven = false;
  return issRoutine
    .filter((r) => r.type !== 'sleep')
    .map((r, i) => {
      const past = hour(r.time) <= nowH;
      const state: RoutineTask['state'] = past ? 'done' : nextGiven ? 'scheduled' : 'next';
      if (!past) nextGiven = true;
      return { id: `t${i}`, time: r.time, label: shortTask(r.task), state, target: TARGET[r.type] ?? 'home' };
    });
})();

const lastSleep = MISSION_DAYS.slice(-7).map((d) => d.sleep).filter(Number.isFinite);
export const GOALS = {
  water: { value: 0, target: targets.find((t) => t.goal === 'water_per_day')?.value ?? NaN, unit: 'L' },
  exercise: { value: 0, target: exerciseTarget, unit: 'h' },
  /** Mean sleep of the last 7 nights (analysis). */
  sleepAvg: Math.round((lastSleep.reduce((a, b) => a + b, 0) / (lastSleep.length || 1)) * 10) / 10,
  sleepTarget: daily.reference.sleep?.green_min ?? NaN,
};



/* ------------------------------------------------------------------ */
/* Body map — 10 sensor zones. Readings only where the analysis has data. */
/* ------------------------------------------------------------------ */

const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const bandSide = (key: string) => daily.series[key]?.find((p) => p.day === TODAY_DAY)?.side ?? '';
const zoneStatus = (keys: string[]): Status => (keys.some((k) => ['high', 'low'].includes(bandSide(k))) ? 'advisory' : 'normal');
const today = MISSION_DAYS[MISSION_DAYS.length - 1];
const READING: Record<number, { reading: string; note: string; keys: string[] }> = {
  3: { reading: `${fmt(today.temp, 1)} °C core`, note: 'Day ' + TODAY_DAY + ' morning check vs your band.', keys: ['temperature'] },
  4: { reading: `${fmt(today.systolic)}/${fmt(today.diastolic)} mmHg`, note: 'Day ' + TODAY_DAY + ' morning check vs your band.', keys: ['bp_systolic', 'bp_diastolic'] },
  5: { reading: `SpO₂ ${fmt(today.spo2)} %`, note: 'Day ' + TODAY_DAY + ' morning check vs your band.', keys: ['spo2'] },
  8: { reading: `${fmt(today.hr)} bpm · ${fmt(today.spo2)} %`, note: 'Day ' + TODAY_DAY + ' morning check vs your band.', keys: ['heart_rate', 'spo2'] },
};
function zone(id: number, name: string, sensor: string, about: string, x: number, y: number): BodyZone {
  const r = READING[id];
  return {
    id, name, sensor, about, x, y,
    status: r ? zoneStatus(r.keys) : 'normal',
    reading: r?.reading ?? '—',
    note: r?.note ?? 'No data for this sensor in the demo.',
  };
}

export const BODY_ZONES: BodyZone[] = [
  zone(1, 'Forehead', 'Skin temperature patch', 'Tracks skin temperature and sweat — early sign of fever or overheating in the suit.', 103, 22),
  zone(2, 'Neck', 'Carotid PPG', 'Pulse wave at the carotid. Fluid shift toward the head shows up here first.', 101, 44),
  zone(3, 'Ear', 'In-ear core thermometer', 'Best estimate of core body temperature; also used for vestibular symptom logging.', 124, 54),
  zone(4, 'Chest · heart', 'ECG lead + BP reference', 'Heart rhythm and pressure. Microgravity shifts fluid and can change cardiac load.', 86, 92),
  zone(5, 'Chest · lungs', 'Respiration belt + SpO₂ relay', 'Breathing rate and oxygen saturation. CO₂ build-up raises breathing rate.', 116, 88),
  zone(6, 'Abdomen', 'Bio-impedance (hydration)', 'Estimates body water — dehydration is common in the first weeks of flight.', 92, 126),
  zone(7, 'Lower back', 'Posture IMU', 'Spine elongates in microgravity; this tracks posture and back strain.', 120, 132),
  zone(8, 'Wrist', 'Optical HR + SpO₂', 'Main heart rate and blood oxygen sensor; backup when the chest strap is off.', 53, 128),
  zone(9, 'Thigh', 'EMG + bone loading', 'Muscle activity and loading during exercise — protects against bone and muscle loss.', 83, 228),
  zone(10, 'Calf', 'Leg circumference band', '"Bird legs": fluid leaves the legs in microgravity. Tracks the shift over time.', 117, 264),
];
