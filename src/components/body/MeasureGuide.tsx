import { useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react';
import measurementsCsv from '../../data/measurements.csv?raw';
import rangesCsv from '../../data/measurement_ranges.csv?raw';
import { useVitals } from '../../utils/VitalsContext';
import Card from '../ui/Card';

type Measurement = {
  id: string;
  name: string;
  unit: string;
  locations: string;
  frequency: string;
  how_to_measure: string;
  how_to_measure_space: string;
  why_it_matters: string;
  what_to_do_yellow: string;
  what_to_do_red: string;
};

type Reference = {
  measurement_id: string;
  location: string;
  applies_to: string;
  ref_green_min: string;
  ref_green_max: string;
  ref_red_below: string;
  ref_red_above: string;
};

type Level = 'green' | 'yellow' | 'red' | 'review';
type Reading = { values: Record<string, number>; level: Level; at: string; previous?: number };

// Both checked-in measurement tables store one record per line.
function readTable<T>(csv: string): T[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.filter(Boolean).map((line) => {
    const fields = Array.from(line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g),
      ([, quoted, plain]) => quoted === undefined ? plain : quoted.replaceAll('""', '"'));
    return Object.fromEntries(keys.map((key, index) => [key, fields[index] ?? ''])) as T;
  });
}

const measurements = readTable<Measurement>(measurementsCsv).filter(
  (row) => !/^not (measured|used)\b/i.test(row.how_to_measure_space.trim()),
);
const references = readTable<Reference>(rangesCsv);

/** Groups of the checklist, from the `frequency` column of measurements.csv. */
type Group = 'daily' | 'weekly' | 'continuous' | 'spacewalk';
const GROUPS: { id: Group; label: string; hint: string }[] = [
  { id: 'daily', label: 'Daily', hint: 'every morning or night' },
  { id: 'weekly', label: 'Weekly', hint: 'once a week or with symptoms' },
  { id: 'continuous', label: 'Read from a sensor', hint: 'cabin sensor or dosimeter' },
  { id: 'spacewalk', label: 'Spacewalk', hint: 'suit telemetry' },
];
function groupOf(row: Measurement): Group {
  const f = row.frequency.toLowerCase();
  if (row.locations === 'spacewalk') return 'spacewalk';
  if (f.startsWith('continuous')) return 'continuous';
  if (f.startsWith('daily') || f.startsWith('every') || f.startsWith('same as')) return 'daily';
  if (f.includes('week')) return 'weekly';
  return 'daily';
}
const shortFrequency = (row: Measurement) =>
  row.frequency.replace(/\s*\(.*?\)/g, '').replace(/^same as .*/i, 'daily').split(',')[0].split(';')[0];
const illustrations = import.meta.glob<{ default: ComponentType }>('../Animations/*.tsx', { eager: true });
const prefixes: Record<string, string> = {
  bp_systolic: 'BloodPressure', bp_diastolic: 'BloodPressure', heart_rate: 'RestingHeartRate',
  spo2: 'Oxygen', temperature: 'BodyTemperature', body_mass: 'BodyMass', sleep: 'Sleep',
  ecg_qtc: 'HeartRhythm', respiratory_rate: 'BreathingRate', glucose: 'BloodSugar',
  cognition_pvt: 'AttentionTest', radiation_dose: 'RadiationDose', hydration_urine: 'Hydration',
  bone_density: 'BoneDensity', vision_acuity: 'VisionCheck', vo2max: 'AerobicFitness',
  muscle_strength: 'MuscleStrength', suit_pressure: 'SuitPressure', suit_co2: 'SuitCO2',
  eva_time_remaining: 'TimeRemaining', suit_temperature: 'SuitTemperature', cabin_co2: 'CabinCO2',
  orthostatic_sys_drop: 'StandingTest', orthostatic_dia_drop: 'StandingTestDiastolic',
};

const demoSuitReadings: Record<string, string> = {
  suit_pressure: '4.3', suit_co2: '2.5', eva_time_remaining: '42', suit_temperature: '22',
};

function suitReference(rule: Reference, unit: string) {
  const { ref_green_min: min, ref_green_max: max } = rule;
  if (min && max) return `${min}–${max} ${unit}`;
  if (min) return `At least ${min} ${unit}`;
  if (max) return `Up to ${max} ${unit}`;
  return 'Trend only · no reference range in the project data';
}

const STORAGE_KEY = 'maia-guided-measurements';
const levels: Level[] = ['green', 'review', 'yellow', 'red'];
const levelLabel: Record<Level, string> = {
  green: 'Within reference', yellow: 'Yellow · Recheck guidance',
  red: 'Red · Follow-up guidance', review: 'Recorded · Review needed',
};

function restore<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function classify(id: string, value: number, location: string, sex: string): Level {
  const rule = references.find((row) => row.measurement_id === id && row.location === location &&
    (row.applies_to === 'all' || row.applies_to === sex));
  if (!rule) return 'review';
  if ((rule.ref_red_below && value < Number(rule.ref_red_below)) ||
      (rule.ref_red_above && value > Number(rule.ref_red_above))) return 'red';
  if ((rule.ref_green_min && value < Number(rule.ref_green_min)) ||
      (rule.ref_green_max && value > Number(rule.ref_green_max))) return 'yellow';
  // In-flight temperature also depends on a personal baseline, which this flow does not collect.
  if (id === 'temperature' && location !== 'back_on_earth') return 'review';
  return rule.ref_green_min || rule.ref_green_max ? 'green' : 'review';
}

const urineShades = ['#fff9df', '#fff1b2', '#f8df82', '#ecc54d', '#dba62d', '#bb831f', '#97601d', '#734918'];

function UrineColorChart({ selected, onSelect, location }: {
  selected?: string;
  onSelect: (value: string) => void;
  location: string;
}) {
  const level = selected ? classify('hydration_urine', Number(selected), location, '') : undefined;
  return (
    <div style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <h3>Urine color chart</h3>
      <p>Choose the closest shade, from pale yellow to dark amber.</p>
      <div role="group" aria-label="Urine color scale" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        {urineShades.map((shade, index) => {
          const value = String(index + 1);
          const active = selected === value;
          return <button key={value} type="button" aria-pressed={active} aria-label={`Shade ${value}`}
            style={{ display: 'grid', gap: 5, padding: 5, background: '#fff', borderRadius: 10, cursor: 'pointer',
              border: active ? '2px solid #294d60' : '2px solid transparent', color: '#182c39' }}
            onClick={() => onSelect(value)}>
            <span aria-hidden="true" style={{ background: shade, height: 36, borderRadius: 5, border: '1px solid #0002' }} />
            <span>{value}{active ? ' ✓' : ''}</span>
          </button>;
        })}
      </div>
      {level && <p role="status" className="guided-measure__status" data-level={level}>
        Shade {selected} · {level === 'green' ? 'Within Maia’s hydration reference' : levelLabel[level]}
      </p>}
      <p className="small muted">Color gives a rough estimate of hydration. Foods, vitamins, and medications can change it.</p>
      <a className="small" href="https://www.nhft.nhs.uk/dietetics/common" target="_blank" rel="noreferrer">NHS hydration reference</a>
    </div>
  );
}

const ATTENTION_KEY = 'maia-attention-attempts';

function AttentionTimer({ onComplete, onRecorded }: { onComplete: () => void; onRecorded: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'ready' | 'early' | 'done'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [attempts, setAttempts] = useState(() => restore<number[]>(ATTENTION_KEY, []));
  const [comparison, setComparison] = useState<number>();
  const [storageError, setStorageError] = useState(false);
  const start = useRef(0);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = window.setTimeout(() => {
      start.current = performance.now();
      setPhase('ready');
    }, 1400 + Math.random() * 2600);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const timer = window.setInterval(() => setElapsed(Math.round(performance.now() - start.current)), 30);
    return () => window.clearInterval(timer);
  }, [phase]);

  function press() {
    if (phase === 'waiting') {
      setPhase('early');
      return;
    }
    if (phase !== 'ready') {
      setElapsed(0);
      setPhase('waiting');
      return;
    }
    const time = Math.round(performance.now() - start.current);
    if (time < 100) {
      setElapsed(0);
      setPhase('early');
      return;
    }
    const sorted = [...attempts].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    setComparison(sorted.length ? (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2 : undefined);
    const next = [...attempts, time].slice(-20);
    setAttempts(next);
    setElapsed(time);
    setPhase('done');
    onRecorded();
    try {
      localStorage.setItem(ATTENTION_KEY, JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }

  const rating = elapsed <= 300 ? 'Typical or faster' : elapsed < 355 ? 'Slightly slower' : 'Slower response';
  const difference = comparison === undefined ? 0 : Math.round(elapsed - comparison);
  return (
    <div className="guided-measure__fields">
      <strong>Reaction timer</strong>
      <p className="small muted">Wait for the button to turn green, then press it as quickly as you can.</p>
      <strong className="mono" style={{ fontSize: 30 }}>{elapsed} <small>ms</small></strong>
      <button type="button" className="btn" onClick={press}
        style={phase === 'ready' ? { background: '#227744', color: 'white', borderColor: '#227744' } : undefined}>
        {phase === 'ready' ? 'Stop timer' : phase === 'waiting' ? 'Wait for green…' : phase === 'idle' ? 'Start trial' : 'Try again'}
      </button>
      {phase === 'early' && <p role="status">Too early. Wait for the green button on your next attempt.</p>}
      {phase === 'done' && <>
        <p role="status" className="guided-measure__status" data-level={elapsed <= 300 ? 'green' : 'yellow'}>
          {rating} · {elapsed} ms
        </p>
        <p className="small muted">Quick-check scale: 100–300 ms typical or faster · 301–354 ms slightly slower · 355 ms or longer slower.</p>
        <p className="small muted">This single response estimates reaction speed. It cannot determine how well you slept or whether you are ready for duty.</p>
        <a className="small" href="https://pmc.ncbi.nlm.nih.gov/articles/8240655/" target="_blank" rel="noreferrer">Reaction-time research</a>
        <p role="status">{comparison === undefined
          ? `First trial recorded at ${elapsed} ms. Try again to compare your times.`
          : `${elapsed} ms · Previous median ${comparison} ms. ${difference === 0 ? 'Same as your previous median.' : `${Math.abs(difference)} ms ${difference < 0 ? 'faster' : 'slower'}.`}`}</p>
        {storageError && <p className="small muted">Saved for this session only.</p>}
        <button type="button" className="btn btn--secondary" onClick={onComplete}>Next measurement →</button>
      </>}
    </div>
  );
}

const VISION_KEY = 'maia-vision-check';
const visionStages = [
  { eye: 'Right', test: 'Near' }, { eye: 'Left', test: 'Near' },
  { eye: 'Right', test: 'Distance' }, { eye: 'Left', test: 'Distance' },
  { eye: 'Right', test: 'Grid' }, { eye: 'Left', test: 'Grid' },
] as const;
const optotypes = 'CDHKNORSVZ';
const nearSizes = [52, 38, 28, 20, 14, 10];
const distanceSizes = [150, 112, 84, 63, 47, 35];
type VisionFinding = number | 'No distortion reported' | 'Distortion or missing area reported';

function VisionTest({ onRecorded, onComplete }: { onRecorded: () => void; onComplete: () => void }) {
  const [findings, setFindings] = useState<VisionFinding[]>([]);
  const [row, setRow] = useState(0);
  const [letters] = useState(() => visionStages.map(() =>
    nearSizes.map(() => optotypes[Math.floor(Math.random() * optotypes.length)])));
  const [storageError, setStorageError] = useState(false);
  const stage = visionStages[findings.length];

  function record(finding: VisionFinding) {
    const next = [...findings, finding];
    setFindings(next);
    setRow(0);
    if (next.length === visionStages.length) {
      onRecorded();
      try {
        localStorage.setItem(VISION_KEY, JSON.stringify(next));
      } catch {
        setStorageError(true);
      }
    }
  }

  if (!stage) return (
    <div className="guided-measure__fields" aria-live="polite">
      <strong>✓ Vision check complete</strong>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', margin: 0 }}>
        {visionStages.map(({ eye, test }, index) => {
          const outcome = findings[index];
          return <div key={`${eye}-${test}`} style={{ display: 'contents' }}>
            <dt>{eye} eye · {test}</dt>
            <dd style={{ margin: 0 }}>{typeof outcome === 'number'
              ? outcome > 0 ? `Level ${outcome} of ${nearSizes.length}` : 'No letter reported clear'
              : outcome}</dd>
          </div>;
        })}
      </dl>
      <p className="small muted">Levels reflect the smallest letter you reported clear on this screen. Use the same screen, zoom, and viewing distances when repeating the check.</p>
      {storageError && <p className="small">Saved for this session only.</p>}
      <button className="btn" type="button" onClick={onComplete}>Next measurement →</button>
    </div>
  );

  const grid = stage.test === 'Grid';
  const sizes = stage.test === 'Distance' ? distanceSizes : nearSizes;
  return (
    <div className="guided-measure__fields">
      <strong>{stage.test} check · {stage.eye} eye · {findings.length + 1} of {visionStages.length}</strong>
      <p>Cover your {stage.eye === 'Right' ? 'left' : 'right'} eye without pressing on it. {stage.test === 'Distance'
        ? 'View the screen from about 2 meters away. Have a crewmate enter your answers if needed.'
        : 'Hold the screen at a comfortable reading distance, about 40 cm away.'}</p>
      {grid ? (
        <>
          <p>Look at the center dot. Do any lines look wavy, blurred, dark, or missing?</p>
          <svg viewBox="0 0 200 200" role="img" aria-label="Square Amsler-style grid with a black center dot"
            style={{ width: '100%', maxWidth: 220, background: 'white' }}>
            <path d={Array.from({ length: 21 }, (_, i) => `M${i * 10} 0v200 M0 ${i * 10}h200`).join(' ')} stroke="#222" fill="none" />
            <circle cx="100" cy="100" r="4" fill="#000" />
          </svg>
          <div className="guided-measure__actions">
            <button className="btn" type="button" onClick={() => record('No distortion reported')}>Lines look straight</button>
            <button className="btn btn--secondary" type="button" onClick={() => record('Distortion or missing area reported')}>I see a change</button>
          </div>
        </>
      ) : (
        <>
          <p className="small muted">Level {row + 1} of {sizes.length}. Read the letter aloud.</p>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 172, background: 'white', color: '#111', borderRadius: 12,
            font: `700 ${sizes[row]}px/1 Arial, sans-serif` }}>{letters[findings.length][row]}</div>
          <div className="guided-measure__actions">
            <button className="btn" type="button" onClick={() => row + 1 === sizes.length ? record(row + 1) : setRow(row + 1)}>I can read it</button>
            <button className="btn btn--secondary" type="button" onClick={() => record(row)}>I can’t read it clearly</button>
          </div>
        </>
      )}
      <p className="small muted">Screen-based self-check. Letter sizes are approximate and do not produce a 20/20 score.</p>
      <a className="small" href="https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf" target="_blank" rel="noreferrer">NASA vision monitoring reference</a>
    </div>
  );
}

const SHORT_LEVEL: Record<Level, string> = { green: 'In range', yellow: 'Recheck', red: 'Follow up', review: 'Review' };

export function RecordedMeasurements({ earlier = [] }: { earlier?: { label: string; value: string }[] }) {
  const saved = restore<Record<string, Reading>>(STORAGE_KEY, {});
  const attention = restore<number[]>(ATTENTION_KEY, []).at(-1);
  const vision = restore<VisionFinding[]>(VISION_KEY, []);
  const rows = measurements.flatMap((measurement) => {
    const { id, name, unit } = measurement;
    const reading = saved[id];
    if (id === 'bp_diastolic') return [];
    if (id === 'cognition_pvt' && attention !== undefined) return [{ label: name, value: `${attention} ms`, level: undefined as Level | undefined, at: undefined as string | undefined }];
    if (id === 'vision_acuity' && vision.length === visionStages.length) return [{
      label: name,
      value: visionStages.map(({ eye, test }, index) =>
        `${eye} ${test.toLowerCase()}: ${typeof vision[index] === 'number' ? `level ${vision[index]}` : vision[index]}`).join(' · '),
      level: undefined, at: undefined,
    }];
    if (!reading) return [];
    const value = id === 'bp_systolic'
      ? `${reading.values.bp_systolic}/${reading.values.bp_diastolic}`
      : String(reading.values[id]);
    return [{ label: id === 'bp_systolic' ? 'Blood pressure' : name, value: `${value} ${unit}`, level: reading.level, at: reading.at }];
  });
  const entries = [...rows, ...earlier.map((e) => ({ ...e, level: undefined, at: undefined }))];
  if (!entries.length) return <p className="small muted">No recorded measurements yet. Readings saved in Measure will appear here.</p>;
  return <ul className="recorded-list">
    {entries.map(({ label, value, level, at }, index) => <li key={index}>
      <span className="recorded-list__name">{label}</span>
      <span className="recorded-list__value">{value}</span>
      {level ? <span className={`recorded-list__pill recorded-list__pill--${level}`} title={levelLabel[level]}>{SHORT_LEVEL[level]}</span> : <span />}
      {at && <span className="recorded-list__time">{new Date(at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>}
    </li>)}
  </ul>;
}

export default function MeasureGuide() {
  const { evaMode } = useVitals();
  const [profile] = useState(() => restore<{ sex?: string; avatarId?: string }>('userProfile', {}));
  const sex = profile.sex?.toLowerCase() ?? '';
  const avatar = sex === 'male' || (sex === 'other' && profile.avatarId?.startsWith('male-')) ? 'M' : 'W';
  const [saved, setSaved] = useState(() => restore<Record<string, Reading>>(STORAGE_KEY, {}));
  const blockedIndex = measurements.findIndex((row) => saved[row.id]?.level === 'red');
  const [selected, setSelected] = useState(() => Math.max(0, blockedIndex));
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Reading | undefined>(() => blockedIndex < 0 ? undefined : saved[measurements[blockedIndex].id]);
  const [storageError, setStorageError] = useState(false);
  const [attentionDone, setAttentionDone] = useState(() =>
    restore<number[]>(ATTENTION_KEY, []).some((time) => Number.isFinite(time) && time >= 100));
  const [visionDone, setVisionDone] = useState(() => restore<VisionFinding[]>(VISION_KEY, []).length === visionStages.length);
  const measurement = measurements[selected];
  const { id } = measurement;
  const suitSample = demoSuitReadings[id];
  const suitRange = suitSample ? references.find((row) => row.measurement_id === id && row.location === 'spacewalk') : undefined;
  const suitValue = values[id]?.trim().replace(',', '.');
  const suitPreview = suitSample && suitValue && Number.isFinite(Number(suitValue))
    ? classify(id, Number(suitValue), 'spacewalk', sex) : undefined;
  const paired = id === 'bp_systolic' ? measurements.find((row) => row.id === 'bp_diastolic') : undefined;
  const fields = paired ? [measurement, paired] : [measurement];
  const title = paired ? 'Blood pressure' : measurement.name;
  const location = suitSample || (evaMode && measurement.locations.split('|').includes('spacewalk')) ? 'spacewalk' : 'iss';
  const instruction = measurement.how_to_measure_space;
  const steps = (/^same\b/i.test(instruction) ? measurement.how_to_measure : instruction).split('|').filter(Boolean);
  const atEntry = step >= steps.length;
  const prefix = prefixes[id];
  const warning = result?.level === 'red' ? 'R' : result?.level === 'yellow' ? 'A' : '';
  const sceneNames = warning ? [warning, 'AYR'] : [String(Math.min(step + 1, steps.length))];
  const Scene = sceneNames.map((suffix) => illustrations[`../Animations/${prefix}${suffix}${avatar}.tsx`]?.default).find(Boolean);
  const guidance = result?.level === 'red' ? measurement.what_to_do_red : measurement.what_to_do_yellow;

  const [open, setOpen] = useState(true);
  /** Tap a measurement: open it (and start its guide), or close it if it is already open. */
  function toggle(index: number) {
    if (index === selected) { setOpen(!open); return; }
    choose(index);
    setOpen(true);
  }
  useEffect(() => {
    if (!open) return;
    document.getElementById(`measure-row-${measurements[selected]?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected, open]);

  function choose(index: number) {
    if (blockedIndex >= 0 && index !== blockedIndex) return;
    setSelected(index);
    setStep(0);
    setValues({});
    setResult(undefined);
    setStorageError(false);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed: Record<string, number> = {};
    let level: Level = 'green';
    for (const field of fields) {
      const input = values[field.id]?.trim().replace(',', '.');
      if (!input || !Number.isFinite(Number(input))) return;
      parsed[field.id] = Number(input);
      const fieldLevel = classify(field.id, parsed[field.id], location, sex);
      if (levels.indexOf(fieldLevel) > levels.indexOf(level)) level = fieldLevel;
    }
    const reading = { values: parsed, level, at: new Date().toISOString(),
      previous: suitSample ? saved[id]?.values[id] : undefined };
    const next = { ...saved, [id]: reading };
    setSaved(next);
    const remaining = measurements.findIndex((row) => next[row.id]?.level === 'red');
    if (level !== 'red' && remaining >= 0) {
      setSelected(remaining);
      setStep(0);
      setValues({});
      setResult(next[measurements[remaining].id]);
    } else {
      setResult(reading);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }

  const complete = () => selected < measurements.length - 1
    ? choose(selected + (paired ? 2 : 1))
    : choose(0);

  const checklist = measurements.filter((row) => row.id !== 'bp_diastolic');
  const isRecorded = (key: string) => Boolean(saved[key] ||
    (key === 'cognition_pvt' && attentionDone) || (key === 'vision_acuity' && visionDone));
  const checklistComplete = checklist.every((row) => isRecorded(row.id));
  const followUps = checklist.filter((row) => saved[row.id]?.level === 'yellow' || saved[row.id]?.level === 'red').length;
  const reviewCount = checklist.filter((row) => saved[row.id]?.level === 'review').length;
  const greenCount = checklist.filter((row) => saved[row.id]?.level === 'green').length;

  // The guide (picture + steps + entry) opens inside the list, under the chosen measurement.
  const guide = (
      <div className="guided-measure__grid">
        <div className="guided-measure__visual">
          {id === 'hydration_urine' && !result ? (
            <UrineColorChart selected={values[id]} onSelect={(value) => setValues({ [id]: value })} location={location} />
          ) : Scene && (!atEntry || warning || id === 'vision_acuity' || suitSample) ? <Scene /> :
            <div className="guided-measure__empty"><strong>{result ? levelLabel[result.level] : id === 'cognition_pvt' ? 'Attention test' : 'Your reading'}</strong>
              {result && <p>{fields.map((field) => `${result.values[field.id]} ${field.unit}`).join(' · ')}</p>}
            </div>}
        </div>
        <Card className="guided-measure__panel">
          <h2>{title}</h2>
          <p className="small muted">{measurement.why_it_matters}</p>
          {suitRange && (
            <div className="guided-measure__fields">
              <p><strong>Where to look</strong> · Read {measurement.name.toLowerCase()} on the suit telemetry display shown in the illustration.</p>
              <p><strong>Project suit reference</strong> · {suitReference(suitRange, measurement.unit)}</p>
              {id === 'suit_temperature' && <p className="small muted">{(result ? result.previous : saved[id]?.values[id]) === undefined
                ? 'No previous temperature recorded for comparison.'
                : `Previous recorded temperature: ${result ? result.previous : saved[id]?.values[id]} ${measurement.unit}.`}
                {result?.previous !== undefined && ` Change: ${Number((result.values[id] - result.previous).toFixed(2))} ${measurement.unit}.`}
              </p>}
            </div>
          )}
          {result ? (
            <>
              <p className="guided-measure__status" data-level={result.level} role="status">{levelLabel[result.level]}</p>
              {suitSample && <p><strong>Recorded reading</strong> · {result.values[id]} {measurement.unit}</p>}
              {warning && <p>{guidance.replaceAll('Spica', 'Maia')}</p>}
              {result.level === 'review' && id !== 'suit_temperature' && <p className="small">This reading needs a personal baseline or a reference range that is unavailable in this guide.</p>}
              {result.level === 'red' && <p className="small">Follow the guidance above. You can continue once a repeat reading is no longer red.</p>}
              {warning && <p className="small muted">Demo guidance. No notification was sent.</p>}
              {storageError && <p role="status" className="small">Saved for this session only.</p>}
              <div className="guided-measure__actions">
                {warning && <button className="btn btn--secondary" type="button" onClick={() => choose(selected)}>Repeat measurement</button>}
                {result.level !== 'red' && <button className="btn" type="button" onClick={complete}>{selected === measurements.length - 1 ? 'Return to first measurement' : 'Next measurement →'}</button>}
              </div>
            </>
          ) : atEntry && id === 'cognition_pvt' ? (
            <AttentionTimer onComplete={complete} onRecorded={() => setAttentionDone(true)} />
          ) : atEntry && id === 'vision_acuity' ? (
            <VisionTest onComplete={complete} onRecorded={() => setVisionDone(true)} />
          ) : atEntry ? (
            <form className="guided-measure__fields" onSubmit={save}>
              <strong>{suitSample ? 'Enter the suit reading' : 'Enter your reading'}</strong>
              {suitSample && <p className="small muted">Type the value shown on the suit display. You can use the illustrated reading to try the demo.</p>}
              {id === 'hydration_urine' ? <p>{values[id] ? `Selected shade: ${values[id]}` : 'Select a shade from the chart.'}</p> :
              fields.map((field) => <label key={field.id}>{paired ? (field.id === 'bp_systolic' ? 'Systolic' : 'Diastolic') : field.name} · {field.unit}
                <input type="text" inputMode="decimal" pattern="[+\-]?(?:[0-9]+(?:[.,][0-9]*)?|[.,][0-9]+)" title="Enter a number, such as 36.6 or 36,6" required value={values[field.id] ?? ''}
                  onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />
              </label>)}
              {suitPreview && <p className="guided-measure__status" data-level={suitPreview} role="status">
                {suitPreview === 'review' ? 'Ready to record for trend' : levelLabel[suitPreview]}
              </p>}
              <div className="guided-measure__actions">
                <button className="btn btn--secondary" type="button" onClick={() => setStep(step - 1)}>← Back</button>
                <button className="btn" type="submit" disabled={id === 'hydration_urine' && !values[id]}>Save reading →</button>
              </div>
            </form>
          ) : (
            <>
              <strong>Step {step + 1} of {steps.length}</strong>
              <p aria-live="polite">{steps[step]}</p>
              <div className="guided-measure__actions">
                {step > 0 && <button className="btn btn--secondary" type="button" onClick={() => setStep(step - 1)}>← Back</button>}
                <button className="btn" type="button" onClick={() => setStep(step + 1)}>
                  {step === steps.length - 1 ? (id === 'cognition_pvt' ? 'Open reaction timer →' : id === 'vision_acuity' ? 'Start vision check →' : 'Enter reading →') : 'Complete step →'}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
  );

  return (
    <section aria-label="Guided measurements" className="guided-measure">
      <style>{`
        .guided-measure { display: grid; gap: 14px; }
        .measure-acc { list-style: none; margin: 0; padding: 0; border: 1px solid #e6e7e2; border-radius: 14px; overflow: hidden; background: #fff; }
        .measure-acc li + li { border-top: 1px solid #e6e7e2; }
        .measure-acc__row { width: 100%; display: grid; grid-template-columns: 1fr auto 28px; align-items: center; gap: 12px; padding: 13px 16px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
        .measure-acc__row:hover:not(:disabled) { background: #f6f7f4; }
        .measure-acc__row:disabled { opacity: .45; cursor: not-allowed; }
        .measure-acc li.is-open > .measure-acc__row { background: #f2f5f6; }
        .measure-acc__name { font-weight: 600; font-size: 15px; }
        .measure-acc__freq { font-size: 12px; color: #6b7a86; }
        .measure-acc__pill { border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 600; background: #eef0ec; color: #3b4650; }
        .measure-acc__pill--green { background: #e8f3d6; color: #315314; }
        .measure-acc__pill--yellow { background: #f8e9ad; color: #5f4600; }
        .measure-acc__pill--red { background: #f8d8d6; color: #8a211b; }
        .measure-acc__chev { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; border: 1px solid #deded9; font-size: 16px; line-height: 1; }
        .measure-acc__body { padding: 4px 14px 16px; background: #f9faf8; }
        .guided-measure__group + .guided-measure__group { margin-top: 12px; }
        .guided-measure__group h3 { font-size: 13px !important; margin: 4px 0 6px; text-transform: uppercase; letter-spacing: .08em; }
        .guided-measure__picker { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
        .measure-card { display: grid; gap: 3px; align-content: start; min-height: 62px; padding: 10px 12px; text-align: left; border: 1px solid #deded9; border-radius: 12px; background: #fff; color: inherit; font: inherit; cursor: pointer; }
        .measure-card:hover { border-color: #688594; }
        .measure-card[aria-pressed="true"] { background: #191c20; color: #fff; border-color: #191c20; }
        .measure-card:disabled { opacity: .45; cursor: not-allowed; }
        .measure-card__name { font-weight: 650; font-size: 13px; line-height: 1.25; }
        .measure-card__meta { font-size: 11px; opacity: .75; }
        .measure-card[data-level="green"] .measure-card__meta { color: #315314; opacity: 1; }
        .measure-card[data-level="yellow"] .measure-card__meta { color: #8a6400; opacity: 1; }
        .measure-card[data-level="red"] .measure-card__meta { color: #a3261d; opacity: 1; }
        .measure-card[aria-pressed="true"] .measure-card__meta { color: #fff !important; }
        .guided-measure__grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(270px, 1fr); align-items: start; gap: 14px; }
        .guided-measure__visual { border-radius: 18px; overflow: hidden; background: #142538; height: 340px; display: grid; grid-template-rows: minmax(0, 1fr); align-items: stretch; }
        .guided-measure__visual > img { width: 100% !important; height: 100% !important; object-fit: contain; background: #eef2f4; }
        .guided-measure__visual > figure { height: 100%; display: grid; grid-template-rows: minmax(0, 1fr) auto; }
        .guided-measure__visual > figure > div { min-height: 0 !important; height: 100%; box-sizing: border-box; padding: 4% 6% !important; }
        .guided-measure__visual > figure > div > img { height: 220px !important; max-height: 100%; }
        .guided-measure__visual > figure > figcaption { font-size: 13px !important; padding: 9px 14px !important; }
        .guided-measure__visual > .guided-measure__empty, .guided-measure__visual > div { align-self: center; background: #edf2f3; height: 100%; display: grid; place-content: center; }
        .guided-measure__empty { text-align: center; padding: 24px; color: #304859; }
        .guided-measure__panel { border-top: 3px solid #adc5ce; display: grid; gap: 10px; }
        .guided-measure__panel h2, .guided-measure__panel p { margin: 0; }
        .guided-measure__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .guided-measure__fields { display: grid; gap: 10px; }
        .guided-measure__fields label { display: grid; gap: 4px; }
        .guided-measure__fields input { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #b6c3c9; }
        .guided-measure__status { color: #315314; background: #e8f3d6; border-radius: 10px; padding: 9px 12px; }
        .guided-measure__status[data-level="yellow"] { color: #5f4600; background: #f8e9ad; }
        .guided-measure__status[data-level="red"] { color: #81251e; background: #f8d8d6; }
        .guided-measure__status[data-level="review"] { color: #304859; background: #edf2f3; }
        @media (max-width: 720px) { .guided-measure__grid { grid-template-columns: 1fr; } }
      `}</style>
      <Card title="Measurement checklist" aside={<span>ISS protocol · {checklist.filter((row) => isRecorded(row.id)).length} of {checklist.length} done</span>}>
        <div role="group" aria-label="Choose a measurement">
          {GROUPS.map((group) => {
            const rows = measurements.map((row, index) => ({ row, index }))
              .filter(({ row }) => row.id !== 'bp_diastolic' && groupOf(row) === group.id);
            if (rows.length === 0) return null;
            return (
              <section key={group.id} className="guided-measure__group">
                <h3>{group.label} <span className="small muted">· {group.hint}</span></h3>
                <ul className="measure-acc">
                  {rows.map(({ row, index }) => {
                    const level = saved[row.id]?.level;
                    const isOpen = open && selected === index;
                    return (
                      <li key={row.id} id={`measure-row-${row.id}`} className={isOpen ? 'is-open' : undefined}>
                        <button type="button" className="measure-acc__row" aria-expanded={isOpen}
                          disabled={blockedIndex >= 0 && index !== blockedIndex} onClick={() => toggle(index)}>
                          <span className="measure-acc__name">{row.id === 'bp_systolic' ? 'Blood pressure' : row.name}</span>
                          {isRecorded(row.id)
                            ? <span className={`measure-acc__pill measure-acc__pill--${level ?? 'done'}`}>{level ? SHORT_LEVEL[level] : 'Done'}</span>
                            : <span className="measure-acc__freq">{shortFrequency(row)}</span>}
                          <span className="measure-acc__chev" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen && <div className="measure-acc__body">{guide}</div>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </Card>
      {checklistComplete && (
        <Card title="✓ Measurement checklist complete">
          <p role="status" className="guided-measure__status" data-level={blockedIndex >= 0 ? 'red' : followUps ? 'yellow' : 'green'}>
            {blockedIndex >= 0 ? 'All measurements are recorded. A red reading still needs follow-up.'
              : followUps ? 'You’ve recorded every measurement. Check the flagged readings below.'
              : 'You’re on track. Every measurement on your checklist is recorded.'}
          </p>
          <p className="small muted">{checklist.length} completed · {greenCount} within reference · {followUps} flagged · {reviewCount} for review · Attention and vision checks recorded</p>
          <details>
            <summary>View recorded results</summary>
            <ul>
              {checklist.map((row) => {
                const reading = saved[row.id];
                const name = row.id === 'bp_systolic' ? 'Blood pressure' : row.name;
                const value = row.id === 'bp_systolic' && reading
                  ? `${reading.values.bp_systolic}/${reading.values.bp_diastolic} ${row.unit}`
                  : reading ? `${reading.values[row.id]} ${row.unit}` : 'Check completed';
                return <li key={row.id}><strong>{name}</strong> · {value}{reading && ` · ${levelLabel[reading.level]}`}</li>;
              })}
            </ul>
          </details>
        </Card>
      )}
    </section>
  );
}
