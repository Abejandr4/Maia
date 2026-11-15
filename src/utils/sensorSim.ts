import type { Metric, Scenario, VitalEvaluation, VitalKey, VitalSample } from './types';

export const TICK_MS = 1500;

export const NOMINAL: Record<Metric, number> = {
  systolic: 123,
  diastolic: 79,
  hr: 60,
  spo2: 98,
  temp: 36.6,
};

const NOISE: Record<Metric, number> = {
  systolic: 1.2,
  diastolic: 1,
  hr: 2.5,
  spo2: 0.3,
  temp: 0.04,
};

export const SCENARIOS: Record<
  Scenario,
  { label: string; detail: string; severity: 'warning' | 'critical'; target: Partial<Record<Metric, number>> }
> = {
  nominal: { label: 'Nominal', detail: 'Personal baseline', severity: 'warning', target: {} },
  hypertension: { label: 'High pressure', detail: '162 / 101 mmHg', severity: 'critical', target: { systolic: 162, diastolic: 101, hr: 78 } },
  tachycardia: { label: 'Tachycardia', detail: '148 bpm', severity: 'critical', target: { hr: 148 } },
  hypoxia: { label: 'Hypoxia', detail: '86 % SpO₂', severity: 'critical', target: { spo2: 86, hr: 96 } },
  fever: { label: 'Fever', detail: '39.4 °C', severity: 'warning', target: { temp: 39.4, hr: 86 } },
};

const METRICS: Metric[] = ['systolic', 'diastolic', 'hr', 'spo2', 'temp'];

/** Mean-reverting random walk toward the scenario target. */
export function nextSample(prev: VitalSample, scenario: Scenario): VitalSample {
  const target = { ...NOMINAL, ...SCENARIOS[scenario].target };
  const k = 0.45;
  const next = { t: Date.now() } as VitalSample;
  for (const m of METRICS) {
    next[m] = prev[m] + (target[m] - prev[m]) * k + (Math.random() - 0.5) * 2 * NOISE[m];
  }
  next.spo2 = Math.min(100, next.spo2);
  return next;
}

export function seedHistory(n: number): VitalSample[] {
  const now = Date.now();
  let s: VitalSample = { t: now - n * TICK_MS, ...NOMINAL };
  const out = [s];
  for (let i = 1; i < n; i++) {
    s = { ...nextSample(s, 'nominal'), t: now - (n - i) * TICK_MS };
    out.push(s);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Alert wording                                                       */
/* ------------------------------------------------------------------ */

export const VITAL_NAME: Record<VitalKey, string> = {
  bp: 'Blood pressure',
  hr: 'Heart rate',
  spo2: 'Blood oxygen',
  temp: 'Core temperature',
};

const SPOKEN_UNIT: Record<VitalKey, string> = {
  bp: '',
  hr: 'beats per minute',
  spo2: 'percent',
  temp: 'degrees',
};

const EVA_ACTION: Record<VitalKey, string> = {
  bp: 'Stop work, hold position, and report to the EVA officer.',
  hr: 'Stop work and rest at the nearest handhold. Report to the EVA officer.',
  spo2: 'Check suit oxygen flow and begin return to the airlock.',
  temp: 'Increase cooling garment flow and report to the EVA officer.',
};

const CABIN_ACTION: Record<VitalKey, string> = {
  bp: 'Sit, rest five minutes, then re-measure.',
  hr: 'Stop activity, breathe slowly, and re-measure in five minutes.',
  spo2: 'Check the sensor fit and cabin oxygen. Notify the crew medical officer.',
  temp: 'Hydrate, reduce activity, and log your symptoms.',
};

export function alertSpeech(e: VitalEvaluation, eva: boolean) {
  const lvl = e.status === 'critical' ? 'Critical alert' : 'Warning';
  const value = e.valueText.replace('/', ' over ');
  const action = eva ? EVA_ACTION[e.key] : CABIN_ACTION[e.key];
  return `${lvl}. ${VITAL_NAME[e.key]} ${value} ${SPOKEN_UNIT[e.key]}. ${action}`.replace(/\s+/g, ' ').trim();
}

export function alertLogMessage(e: VitalEvaluation) {
  const dir = e.deviation > 0 ? 'above' : 'below';
  return `${VITAL_NAME[e.key]} ${e.valueText} ${e.unit} — ${dir} the safe range for microgravity.`;
}
