import { useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Range, VitalEvaluation, VitalKey } from '../utils/types';
import { GENERAL_REF, PERSONAL_NORMAL } from '../utils/baselines';
import { AvatarPortrait } from './Initial record/AboutyouPage';
import { useVitals } from '../utils/VitalsContext';
import PageHeader from '../components/ui/PageHeader';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import Card from '../components/ui/Card';
import Sparkline from '../components/ui/Sparkline';
import VitalCard from '../components/body/VitalCard';
import SensorConsole from '../components/body/SensorConsole';

import { dayForDate, EVENTS, MISSION_DAYS, TODAY_DAY, WEEK_SAMPLES } from '../utils/mockData';
import MeasureGuide from '../components/body/MeasureGuide';
import './pages.css';

type BodyTab = 'live' | 'analysis' | 'symptoms' | 'measure';

const VITALS: VitalKey[] = ['bp', 'hr', 'spo2', 'temp'];

const RANGES: Record<VitalKey, { personal: Range; general: Range; digits: number }> = {
  bp: { personal: PERSONAL_NORMAL.systolic, general: GENERAL_REF.systolic, digits: 0 },
  hr: { personal: PERSONAL_NORMAL.hr, general: GENERAL_REF.hr, digits: 0 },
  spo2: { personal: PERSONAL_NORMAL.spo2, general: GENERAL_REF.spo2, digits: 0 },
  temp: { personal: PERSONAL_NORMAL.temp, general: GENERAL_REF.temp, digits: 1 },
};

const zones = [
  {"id":"brain","label":"Brain","point":[43,6],"orbit":[48,6],"measure":"Sleep logged","value":"7.2","unit":"h","trend":"↑ 0.3 h vs. last reading","sensor":"Sleep log","action":"Record how you felt when you woke up.","earth":"Rest provides context for attention and performance.","space":"Changes in light and schedules can shift sleep patterns.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"eyes","label":"Eyes","point":[52,11],"orbit":[55,13],"measure":"Near focus","value":"No change","unit":"","trend":"Same as last reading","sensor":"Visual self-report","action":"Record when a change started and which eye you notice it in.","earth":"Compare your focus in familiar lighting.","space":"Fluid shifts in microgravity can affect vision.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"ears","label":"Ears","point":[35,16],"orbit":[35,17],"measure":"Perceived balance","value":"No dizziness","unit":"","trend":"Same as last reading","sensor":"Vestibular self-report","action":"Record whether symptoms occur during movement or a change in position.","earth":"The inner ear helps with balance and orientation.","space":"Gravity changes can affect how the body orients itself.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"heart","label":"Heart","point":[55,27],"orbit":[55,27],"measure":"Resting heart rate","value":"68","unit":"bpm","trend":"↑ 4 bpm vs. demo baseline","sensor":"Heart-rate monitor","action":"Compare readings taken at rest under similar conditions.","earth":"Recent activity and your baseline help explain a pulse reading.","space":"The cardiovascular system adapts to fluid shifts in orbit.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"lungs","label":"Lungs","point":[44,32],"orbit":[42,33],"measure":"Respiratory rate","value":"15","unit":"breaths/min","trend":"↑ 1 breaths/min vs. last reading","sensor":"Respiratory band","action":"Record whether you were resting or active.","earth":"Respiratory rate is measured in breaths per minute.","space":"Cabin conditions and respiratory readings are tracked separately.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"bones","label":"Bones","point":[41,76],"orbit":[62,76],"measure":"Bone mineral density","value":"Not measured","unit":"","trend":"No comparison available","sensor":"Clinical densitometry","action":"Check the date of your last assessment with the medical team.","earth":"Bone-density scans can show changes between assessments.","space":"Reduced loading in microgravity can accelerate bone mineral loss.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"muscles","label":"Muscles","point":[58,64],"orbit":[41,65],"measure":"Exercise logged","value":"45","unit":"min","trend":"↑ 3 min vs. last reading","sensor":"Training log","action":"Record duration and perceived effort.","earth":"Training duration describes a session. Strength is assessed separately.","space":"Exercise helps maintain muscle function during reduced loading.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"kidneys","label":"Kidneys","point":[48,37],"orbit":[48,41],"measure":"Fluid intake logged","value":"1.8","unit":"L","trend":"↓ 0.1 L vs. last reading","sensor":"Intake log","action":"Check whether your log includes all drinks up to the same time.","earth":"Recorded intake helps track hydration.","space":"Dehydration and increased urinary calcium can contribute to kidney stones.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"skin","label":"Skin","point":[29,48],"orbit":[26,52],"measure":"Skin observation","value":"No change","unit":"","trend":"Same as last reading","sensor":"Inspection and self-report","action":"Record the location and timing of any observed change.","earth":"Describe the same area for comparison next time.","space":"A dosimeter measures radiation exposure during the mission.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id":"immune","label":"Immune system","point":[58,47],"orbit":[64,48],"measure":"Symptoms logged","value":"0","unit":"reports","trend":"Same as last reading","sensor":"Symptom log","action":"Record when symptoms began and report persistent symptoms.","earth":"Clinical assessment is needed to evaluate immune function.","space":"The enclosed environment and flight stressors can affect immune response.","source":"https://www.nasa.gov/humans-in-space/the-human-body-in-space/"}
];

const measurementSteps: Record<string, string[]> = {
  "brain": ["Review last night’s sleep log.","Enter the hours you slept."],
  "eyes": ["Look at familiar text in your usual lighting.","Describe any change in focus."],
  "ears": ["Think about how you felt during routine movements.","Record any dizziness or balance changes."],
  "heart": ["Find a resting reading on the monitor.","Enter the pulse in beats per minute."],
  "lungs": ["Review your resting respiratory reading.","Enter breaths per minute."],
  "bones": ["Locate your most recent bone density report.","Enter the result and unit as shown."],
  "muscles": ["Review your last training session.","Enter the total minutes."],
  "kidneys": ["Check today’s intake log.","Enter the total in liters."],
  "skin": ["Check an accessible area of skin.","Describe the location and any change."],
  "immune": ["Review your symptom log for today.","Enter the number of reports."]
};

type BodyReading = { value: string; time: string };
type DailyLog = { date: string; readings: Record<string, BodyReading> };

const astronaut = import.meta.env.BASE_URL + 'avatars/avatar-astronauta.png';

function readProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem('userProfile') ?? '{}');
    const male = profile?.sex === 'Male' || (profile?.sex === 'Other' && String(profile.avatarId).startsWith('male-'));
    return { avatarId: male ? 'male-1' : 'female-1', tone: typeof profile?.avatarStyle === 'string' ? profile.avatarStyle : undefined };
  } catch {
    return { avatarId: 'female-1', tone: undefined };
  }
}

function readDailyLog(date: string): DailyLog {
  try {
    const saved = JSON.parse(localStorage.getItem('maia-avatar-measurements') ?? 'null');
    if (saved?.date === date && saved.readings && typeof saved.readings === 'object') return saved;
  } catch {
    // Start with an empty log when storage is unavailable.
  }
  return { date, readings: {} };
}

function ProfileBodyMap({ tab, onSelectTab, onLogSymptom, children }: {
  tab: BodyTab;
  onSelectTab: (tab: BodyTab) => void;
  onLogSymptom: () => void;
  children: ReactNode;
}) {
  const [profile] = useState(readProfile);
  const [orbit, setOrbit] = useState(false);
  const [zoneId, setZoneId] = useState<string>('heart');
  const [showZoneAnalysis, setShowZoneAnalysis] = useState(false);
  const [measureId, setMeasureId] = useState('heart');
  const [result, setResult] = useState('');
  const [feedback, setFeedback] = useState('');
  const [dailyLog, setDailyLog] = useState(() => readDailyLog(new Date().toDateString()));
  const dialog = useRef<HTMLDialogElement>(null);
  const today = new Date().toDateString();
  const readings = dailyLog.date === today ? dailyLog.readings : {};
  const selected = zones.find((zone) => zone.id === zoneId);
  const measurement = zones.find((zone) => zone.id === measureId) ?? zones[3];

  function openAnalysis(id: string) {
    setZoneId(id);
    setShowZoneAnalysis(true);
    onSelectTab('analysis');
  }

  function chooseMeasurement(id: string) {
    setMeasureId(id);
    setResult(readings[id]?.value ?? '');
    setFeedback('');
  }

  function openMeasurements() {
    chooseMeasurement(selected?.id ?? 'heart');
    dialog.current?.showModal();
  }

  function saveReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = result.trim();
    if (!value) return;
    const next = { date: today, readings: { ...readings, [measureId]: { value, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } } };
    try {
      localStorage.setItem('maia-avatar-measurements', JSON.stringify(next));
      setDailyLog(next);
      openAnalysis(measureId);
      setFeedback('Reading saved on this device.');
    } catch {
      setFeedback('This browser could not save the reading.');
    }
  }

  return (
    <>
    {(tab === 'live' || tab === 'analysis') && <Card className="body-grid__map" title="Body map · 10 zones" aside={<span>Tap a zone</span>}>
      <SegmentedTabs<'earth' | 'orbit'>
        ariaLabel="Body map environment"
        value={orbit ? 'orbit' : 'earth'}
        onChange={(mode) => {
          setOrbit(mode === 'orbit');
          if (mode === 'earth' && zoneId === 'eva') setZoneId('heart');
        }}
        options={[{ value: 'earth', label: 'Earth' }, { value: 'orbit', label: 'Orbit' }]}
      />
      <div style={{ marginBlock: 12, borderRadius: 12, background: orbit ? '#1d2737' : '#f6f5f0' }}>
        <div role="group" aria-label="Body zones" style={{ position: 'relative', width: 'min(100%, 248px)', aspectRatio: '2 / 3', marginInline: 'auto' }}>
          {orbit
            ? <img src={astronaut} alt="Astronaut with a white suit and gray accents" width={512} height={768} style={{ display: 'block', width: '100%', height: 'auto', filter: 'grayscale(1)' }} />
            : <AvatarPortrait avatarId={profile.avatarId} tone={profile.tone} />}
          {zones.map((zone, index) => {
            const [x, y] = orbit ? zone.orbit : zone.point;
            const chosen = zone.id === zoneId;
            const color = zone.id === 'heart' ? '#b87900' : ['muscles', 'skin'].includes(zone.id) ? '#1682bc' : '#5c900c';
            return (
              <button
                key={zone.id}
                type="button"
                aria-label={`Zone ${index + 1}: ${zone.label}`}
                aria-pressed={chosen}
                title={zone.label}
                onClick={() => openAnalysis(zone.id)}
                style={{ position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%, -50%)', width: 26, height: 26, padding: 0, border: '2px solid ' + color, borderRadius: '50%', background: chosen ? '#dcf4a4' : '#fff', color: '#1c252a', fontWeight: 700, zIndex: chosen ? 1 : undefined }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" className="btn btn--secondary" onClick={openMeasurements}>Daily measurements · {Object.keys(readings).length} of 10</button>
        {orbit && <button type="button" className="btn btn--secondary" aria-pressed={zoneId === 'eva'} onClick={() => openAnalysis('eva')}>Suit life support</button>}
      </div>
      <button type="button" className="btn btn--secondary" onClick={onLogSymptom}>Log a symptom</button>
      <dialog ref={dialog} aria-labelledby="avatar-measure-title" style={{ padding: 18, borderRadius: 12, border: '1px solid #ddd', maxWidth: 'min(92vw, 460px)' }}>
        <form onSubmit={saveReading} style={{ display: 'grid', gap: 10 }}>
          <h2 id="avatar-measure-title">Daily measurements</h2>
          <label>Body zone <select value={measureId} onChange={(event) => chooseMeasurement(event.target.value)}>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
          </select></label>
          <ol className="small">{measurementSteps[measurement.id]?.map((step) => <li key={step}>{step}</li>)}</ol>
          <label>{measurement.measure}{measurement.unit && ` (${measurement.unit})`} <input value={result} onChange={(event) => setResult(event.target.value)} required maxLength={100} /></label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" className="btn">Save reading</button>
            <button type="button" className="btn btn--secondary" onClick={() => dialog.current?.close()}>Close</button>
          </div>
          <p role="status" className="small">{feedback}</p>
        </form>
      </dialog>
    </Card>}
    {tab === 'analysis' && (
      <div className="profile-analysis" style={{ display: 'grid', gap: 14, minWidth: 0 }}>
        {showZoneAnalysis && <Card title={selected?.label ?? 'Suit life support'} aside={<span>{orbit ? 'Orbit' : 'Earth'}</span>}>
          {selected ? (
            <section className="zone-detail" aria-live="polite">
              <p className="small muted">{selected.measure}</p>
              <p className="zone-detail__reading mono">{selected.value} {selected.unit}</p>
              <p className="small muted">{selected.value === 'Not measured' ? 'No reading available' : 'Demo reading · T+ 04:12'} · {selected.trend}</p>
              {selected.id === 'heart' && (
                <figure style={{ margin: '8px 0' }} aria-label="Seven simulated days of heart rate">
                  <Sparkline values={[64, 65, 64, 66, 65, 67, 68]} height={44} band={{ min: 64, max: 64 }} />
                  <figcaption className="small muted">Last 7 simulated days · Baseline 64 bpm</figcaption>
                </figure>
              )}
              {readings[selected.id] && <p className="small">My reading · {readings[selected.id].value} · {readings[selected.id].time}</p>}
              <p className="small"><strong>Sensor or record:</strong> {selected.sensor}</p>
              <p className="small"><strong>What to observe:</strong> {selected.action}</p>
              <p className="small"><strong>{orbit ? 'Why it matters in orbit' : 'Why it matters on Earth'}:</strong> {orbit ? selected.space : selected.earth}</p>
              <a className="small" href={selected.source} target="_blank" rel="noreferrer">View source ↗</a>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button type="button" className="btn btn--secondary" onClick={openMeasurements}>Record this measurement</button>
                <button type="button" className="btn btn--secondary" onClick={() => onSelectTab('symptoms')}>View symptoms</button>
              </div>
            </section>
          ) : (
            <section className="zone-detail" aria-live="polite">
              <p className="zone-detail__reading mono">78% oxygen reserve</p>
              <p className="small muted">Simulated suit telemetry · Oxygen, pressure, and carbon dioxide are tracked separately.</p>
              <a className="small" href="https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/" target="_blank" rel="noreferrer">View source ↗</a>
            </section>
          )}
        </Card>}
        {children}
      </div>
    )}
    {tab === 'live' && children}
    {(tab === 'symptoms' || tab === 'measure') && <div style={{ minWidth: 0, gridColumn: '1 / -1' }}>{children}</div>}
    </>
  );
}

function SymptomsPanel({ onLogSymptom }: { onLogSymptom: () => void }) {
  const { symptoms } = useVitals();
  const entries = [...symptoms].sort((a,b) => Date.parse(a.time) - Date.parse(b.time));
  const headaches = entries.filter((entry) => entry.name.toLowerCase() === 'headache');
  const days = [...new Set(headaches.map((entry) => dayForDate(new Date(entry.time))))];
  const readings = MISSION_DAYS.filter((day) => day.day >= (days[0] ?? TODAY_DAY - 7));
  const co2 = (readings.length > 1 ? readings : MISSION_DAYS.slice(-7)).map((day) => day.co2);
  const zone: Record<string, string> = { headache: 'Brain', dizziness: 'Ears', nausea: 'Abdomen', 'eye strain': 'Eyes', 'muscle soreness': 'Muscles', 'lower back pain': 'Lower back' };
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="profile-symptoms">
      <section aria-label="Symptom log">
        <header className="profile-symptoms__header">
          <div><strong>Symptom log</strong> <span className="small muted mono">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} · plotted in Analysis</span></div>
          <button type="button" className="btn btn--primary" onClick={onLogSymptom}>＋ Log a symptom</button>
        </header>
        <Card className="profile-symptoms__entries">
          {entries.length === 0 && <p style={{ padding: 16 }}>No symptoms logged yet.</p>}
          <ul>
            {entries.map((entry) => {
              const time = new Date(entry.time);
              const severity = entry.severity[0].toUpperCase() + entry.severity.slice(1);
              return (
                <li key={entry.id}>
                  <time className="small mono muted" dateTime={entry.time}>{dateFormat.format(time)}</time>
                  <span className="symptom-chip">{zone[entry.name.toLowerCase()] ?? 'General'}</span>
                  <div>
                    <strong>{entry.name}</strong> <span className={`sev sev--${entry.severity}`}>{entry.severity === 'mild' ? '✓' : '⚠'} {severity}</span>
                    <p className="small muted">{entry.note || 'No note'}</p>
                  </div>
                  <span className="small mono muted">D{dayForDate(time)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
      <aside className="profile-symptoms__aside">
        <Card title="What Maia notices" aside={<span className="symptom-chip correlation-chip">ⓘ Correlation</span>}>
          <strong>{headaches.length ? `${headaches.length} ${headaches.length === 1 ? 'headache' : 'headaches'} since D${days[0]}` : 'No headaches logged'}</strong>
          <div className="profile-symptoms__days">{days.map((day) => <span key={day} className="symptom-chip">D{day}</span>)}</div>
          <section className="profile-symptoms__cabin" aria-label="Cabin carbon dioxide trend">
            <div className="profile-symptoms__header"><span className="small muted">Cabin CO₂</span><b className="small mono">{co2.at(-1)?.toFixed(1)} mmHg</b></div>
            <div style={{ color: '#876800' }}><Sparkline values={co2} height={42} /></div>
            <p className="small muted">Simulated CO₂ readings are shown for the same period. Timing alone cannot establish what caused a symptom.</p>
          </section>
        </Card>
        <Card title="Logging tip">
          <p className="small muted">Log the time and whether you were eating, resting, or exercising. Consistent timing helps your flight surgeon compare symptoms with sensor readings.</p>
        </Card>
      </aside>
    </div>
  );
}

const ANALYSIS_METRICS = {
  systolic: ['Systolic', 'mmHg', 'Blood Pressure'],
  diastolic: ['Diastolic', 'mmHg', 'Blood Pressure'],
  hr: ['Heart rate', 'bpm', 'Heart Rate'],
  spo2: ['SpO₂', '%', 'SpO₂'],
  temp: ['Temperature', '°C', 'Core Temperature'],
  sleep: ['Sleep', 'h', 'Sleep'],
  mass: ['Body mass', 'kg', 'Body Mass'],
} as const;

type AnalysisMetric = keyof typeof ANALYSIS_METRICS;
type AnalysisRange = '24 h' | '7 days' | 'Mission';

function AnalysisPanel() {
  const { history, alerts, symptoms } = useVitals();
  const [metric, setMetric] = useState<AnalysisMetric>('systolic');
  const [period, setPeriod] = useState<AnalysisRange>('Mission');
  const [exported, setExported] = useState(false);
  const [inspected, setInspected] = useState<number | null>(null);
  const [label, unit, alertName] = ANALYSIS_METRICS[metric];
  const daily = MISSION_DAYS.map((record) => ({
    ...record,
    // Simulated daily readings for the inertial body-mass device.
    mass: Number((64 + Math.sin(record.day) * .2 - record.day * .012).toFixed(1)),
  }));
  const first = period === 'Mission' ? 1 : period === '7 days' ? TODAY_DAY - 6 : TODAY_DAY;
  const intraday = period === '24 h' && metric !== 'sleep' && metric !== 'mass';
  const now = Date.now();
  const since = now - 86400000;
  const visible = daily.filter((record) => record.day >= first);
  const points = intraday
    ? [...WEEK_SAMPLES, ...history].filter((sample) => sample.t >= since && sample.t <= now)
        .sort((a, b) => a.t - b.t).map((sample) => ({ value: sample[metric], position: (sample.t - since) / 86400000 }))
    : visible.map((record) => ({ value: record[metric], position: first === TODAY_DAY ? .5 : (record.day - first) / (TODAY_DAY - first) }));
  const baseline = daily.slice(0, 14).map((record) => record[metric]);
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const personal = metric === 'sleep' || metric === 'mass'
    ? { min: Math.min(...baseline), max: Math.max(...baseline) }
    : PERSONAL_NORMAL[metric];
  const general = metric === 'sleep' || metric === 'mass' ? undefined : GENERAL_REF[metric];
  const outside = (value: number) => value < personal.min || value > personal.max;
  const lastSix = daily.slice(-6).filter((record) => outside(record[metric])).length;
  const values = points.map(({ value }) => value);
  const activePoint = inspected === null ? undefined : points[inspected];
  const latest = values.at(-1);
  const status = lastSix >= 4 ? 'Change detected' : latest === undefined ? 'No readings' : outside(latest) ? 'Latest outside your band' : 'Inside your band';
  const countNormal = values.filter((value) => !outside(value)).length;
  const delta = average(daily.slice(-7).map((record) => record[metric])) - average(baseline);
  const alertCount = alerts.filter((alert) => alert.vital === alertName && (period === '24 h'
    ? Date.parse(alert.time) >= since : dayForDate(new Date(alert.time)) >= first)).length;
  const min = Math.min(personal.min, general?.min ?? Infinity, ...values);
  const max = Math.max(personal.max, general?.max ?? -Infinity, ...values);
  const padding = Math.max((max - min) * .08, .05);
  const low = min - padding;
  const high = max + padding;
  const x = (position: number) => 52 + 1110 * position;
  const y = (value: number) => 183 - 155 * (value - low) / (high - low);
  const dayX = (day: number) => x(first === TODAY_DAY ? .5 : (day - first) / (TODAY_DAY - first));
  const ticks = period === 'Mission' ? [1, 7, 14, 21, 28, 35, TODAY_DAY] : visible.map(({ day }) => day);
  const events = [...visible.filter(({ event }) => event).map(({ day, event }) => ({ day, label: event })),
    ...(first <= EVENTS.co2Rise ? [{ day: EVENTS.co2Rise, label: 'CO₂ rise' }] : [])];
  const summary = [
    ['Readings logged', String(values.length), 'Selected window'],
    ['Alerts raised', String(alertCount), label],
    ['Readings in personal range', values.length ? `${Math.round(100 * countNormal / values.length)}%` : '—', 'Selected window'],
    ['Change vs personal normal', `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`, 'Last 7 days vs. days 1–14'],
  ];

  function exportSummary() {
    const file = new Blob([`Maia · Analysis\n${label} · ${period} · Simulated data\n\n`,
      summary.map(([name, value]) => `${name}: ${value}`).join('\n'),
      `\nDays outside personal range: ${lastSix} of the last 6\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maia-analysis-${metric}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  }

  return (
    <section className="analysis-view" aria-label="Mission trends">
      <div className="analysis-toolbar">
        <SegmentedTabs<AnalysisRange> ariaLabel="Analysis period" value={period} onChange={(value) => { setPeriod(value); setExported(false); setInspected(null); }}
          options={(['24 h', '7 days', 'Mission'] as const).map((value) => ({ value, label: value }))} />
        <div className="analysis-metrics" role="group" aria-label="Analysis metric">
          {(Object.keys(ANALYSIS_METRICS) as AnalysisMetric[]).map((key) => (
            <button type="button" key={key} aria-pressed={metric === key}
              onClick={() => { setMetric(key); setExported(false); setInspected(null); }}>{ANALYSIS_METRICS[key][0]}</button>
          ))}
        </div>
        <div className="analysis-legend small muted">
          <span data-key="band">Personal normal (days 1–14)</span>
          {general && <span data-key="reference">General reference</span>}
          <span data-key="series">Your readings</span>
          <span data-key="event">Mission event</span>
        </div>
      </div>
      <Card className="analysis-plot" title={<>{label} <span className="small muted">{unit} · {period === '24 h' ? 'Last 24 hours' : `D${first}–D${TODAY_DAY}`}</span></>}
        aside={<div className="analysis-status"><span data-tone={status === 'Inside your band' ? 'good' : status === 'No readings' ? 'neutral' : 'watch'}>{status}</span>
          <span>{lastSix} of the last 6 days outside your band</span></div>}>
        <div className="analysis-reading">
          <strong>{Number((activePoint?.value ?? latest ?? 0).toFixed(2))} <span>{unit}</span></strong>
          <span className="small muted">{activePoint
            ? intraday ? `${Math.round((1 - activePoint.position) * 1440)} min ago` : `Mission day ${first + Math.round(activePoint.position * (TODAY_DAY - first))}`
            : 'Latest in selected window'}</span>
        </div>
        <div className="analysis-chart">
          <svg viewBox="0 0 1200 290" role="img" aria-label={`${label} trend, ${period}, ${values.length} readings`}
            onPointerLeave={() => setInspected(null)}
            onPointerMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const coordinate = (event.clientX - bounds.left) * 1200 / bounds.width;
              const vertical = (event.clientY - bounds.top) * 290 / bounds.height;
              if (!points.length || coordinate < x(0) || coordinate > x(1) || vertical < 28 || vertical > 183) {
                setInspected(null);
                return;
              }
              setInspected(points.reduce((closest, point, index) =>
                Math.abs(x(point.position) - coordinate) < Math.abs(x(points[closest].position) - coordinate) ? index : closest, 0));
            }}>
            <rect x={x(0)} y="28" width="1110" height="155" rx="5" fill="#f8f9f8" />
            {period === 'Mission' && lastSix >= 4 && <rect x={dayX(TODAY_DAY - 5)} y="28" width={x(1) - dayX(TODAY_DAY - 5)} height="155" fill="#f8f1d4" />}
            {[low, (low + high) / 2, high].map((value) => <g key={value}>
              <line x1={x(0)} x2={x(1)} y1={y(value)} y2={y(value)} stroke="#e1e0db" />
              <text x="44" y={y(value) + 4} textAnchor="end">{Number(value.toFixed(1))}</text>
            </g>)}
            <rect x={x(0)} y={y(personal.max)} width="1110" height={Math.max(1, y(personal.min) - y(personal.max))} fill="#e8e7e1" />
            {general && [general.min, general.max].map((value) => <line key={value} x1={x(0)} x2={x(1)} y1={y(value)} y2={y(value)} stroke="#8a98a4" strokeDasharray="5 4" />)}
            {events.map((event) => <g key={event.day}>
              <line x1={dayX(event.day)} x2={dayX(event.day)} y1="28" y2="183" stroke="#a6a8a7" strokeDasharray="3 3" />
              <text x={dayX(event.day)} y="18" textAnchor="middle">{event.label}</text>
            </g>)}
            <polyline points={points.map(({ position, value }) => `${x(position)},${y(value)}`).join(' ')} fill="none" stroke="#191c20" strokeWidth="2" />
            {points.map(({ position, value }, index) => <circle key={index} cx={x(position)} cy={y(value)} r={intraday ? 1.7 : 3} fill="#191c20"><title>{Number(value.toFixed(2))} {unit}</title></circle>)}
            {activePoint && <g pointerEvents="none">
              <line x1={x(activePoint.position)} x2={x(activePoint.position)} y1="28" y2="183" stroke="#47758a" strokeDasharray="3 3" />
              <circle cx={x(activePoint.position)} cy={y(activePoint.value)} r="5" fill="#284860" stroke="white" strokeWidth="2" />
            </g>}
            {intraday
              ? [0, .25, .5, .75, 1].map((fraction) => <text key={fraction} x={x(fraction)} y="200" textAnchor="middle">{fraction === 1 ? 'Now' : `−${24 * (1 - fraction)} h`}</text>)
              : ticks.map((day) => <text key={day} x={dayX(day)} y="200" textAnchor="middle">D{day}</text>)}
            <rect x="0" y="219" width="1200" height="37" rx="6" fill="#f8f8f6" />
            <text x="4" y="231">SLEEP</text>
            {visible.map(({ day, sleep }) => <rect key={day} x={dayX(day) - 8} y={254 - sleep * 2.8} width="16" height={sleep * 2.8}
              rx="2" fill={sleep < 6.5 ? '#e8be21' : '#284860'}><title>D{day} · {sleep} h asleep</title></rect>)}
            <rect x="0" y="260" width="1200" height="28" rx="6" fill="#f8f8f6" />
            <text x="4" y="272">SYMPTOMS</text>
            {symptoms.filter(({ time }) => period === '24 h' ? Date.parse(time) >= since && Date.parse(time) <= now
              : dayForDate(new Date(time)) >= first && dayForDate(new Date(time)) <= TODAY_DAY).map(({ id, name, time }) => (
              <circle key={id} cx={period === '24 h' ? x((Date.parse(time) - since) / 86400000) : dayX(dayForDate(new Date(time)))} cy="280" r="4" fill="#b42121"><title>{name} · {new Date(time).toLocaleString()}</title></circle>
            ))}
          </svg>
        </div>
      </Card>
      <div className="analysis-summary">
        <div className="analysis-stats">
          {summary.map(([title, value, detail]) => <Card key={title}><div className="analysis-label">{title}</div>
            <strong className="analysis-value">{value}</strong><div className="small muted">{detail}</div></Card>)}
        </div>
        <Card className="analysis-method">
          <div className="analysis-label">How Maia decides</div>
          <p className="small">Maia compares your readings with your personal range from mission days 1–14. It flags a change when <strong>4 or more of the last 6 days</strong> are outside that range.</p>
          <div className="analysis-footer"><span role="status" className="small muted">{exported ? 'Report summary downloaded' : 'Simulated mission data'}</span>
            <button className="btn" type="button" onClick={exportSummary}>Download report summary</button></div>
        </Card>
      </div>
    </section>
  );
}

export default function BodySensorsPage({ onLogSymptom }: { onLogSymptom: () => void }) {
  const { history, evaluations } = useVitals();
  const [tab, setTab] = useState<BodyTab>('live');

  const current = history[history.length - 1];
  const series = useMemo<Record<VitalKey, number[]>>(
    () => ({
      bp: history.map((s) => s.systolic),
      hr: history.map((s) => s.hr),
      spo2: history.map((s) => s.spo2),
      temp: history.map((s) => s.temp),
    }),
    [history],
  );
  const byKey = Object.fromEntries(evaluations.map((e) => [e.key, e])) as Record<VitalKey, VitalEvaluation>;

  return (
    <div className="page page--body">
      <PageHeader
        eyebrow="Personal normal · learned on days 1–14"
        title="Body & Sensors"
        subtitle="Ten zones, four live signals. Every reading shows its age."
        aside={
          <SegmentedTabs<BodyTab>
            ariaLabel="Body view"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'analysis', label: 'Analysis' },
              { value: 'symptoms', label: 'Symptoms' },
              { value: 'measure', label: 'Measure' },
            ]}
          />
        }
      />

      <style>{`
        .page--body .profile-analysis { grid-column: 2 / -1; }
        @media (max-width: 1050px) { .page--body .profile-analysis { grid-column: 1 / -1; } }
        .analysis-view { display: grid; gap: 12px; min-width: 0; }
        .analysis-toolbar, .analysis-metrics, .analysis-legend, .analysis-footer { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .analysis-toolbar, .analysis-footer { justify-content: space-between; }
        .analysis-metrics button { border: 1px solid #deded9; border-radius: 999px; padding: 6px 12px; background: transparent; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
        .analysis-metrics button[aria-pressed="true"] { background: #191c20; color: white; border-color: #191c20; }
        .analysis-legend { column-gap: 14px; }
        .analysis-view .card, .profile-symptoms .card { border-radius: 18px; box-shadow: 0 2px 8px #253a4810; }
        .analysis-toolbar { padding-block: 4px 6px; }
        .analysis-metrics button:hover { border-color: #688594; }
        .analysis-legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .analysis-legend span::before { content: ''; width: 18px; border-top: 2px solid #191c20; }
        .analysis-legend [data-key="band"]::before { height: 10px; border: 1px solid #d8d7d0; background: #e8e7e1; border-radius: 3px; }
        .analysis-legend [data-key="reference"]::before { border-top: 2px dashed #8a98a4; }
        .analysis-legend [data-key="event"]::before { border-top: 2px dotted #a6a8a7; }
        .analysis-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .analysis-status [data-tone] { border-radius: 999px; padding: 4px 10px; background: #eee; color: #29343b; font-weight: 650; }
        .analysis-status [data-tone="good"] { background: #e8f3d6; color: #315314; }
        .analysis-status [data-tone="watch"] { background: #f8e9ad; color: #5f4600; }
        .analysis-reading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; padding: 0 4px; }
        .analysis-reading strong { font-size: 26px; font-variant-numeric: tabular-nums; }
        .analysis-reading strong span { font-size: 12px; color: #566878; }
        .analysis-stats .card { border-top: 2px solid #b8ccd5; }
        .analysis-method { background: linear-gradient(150deg, #f2f7f8, #fff 65%); }
        .profile-symptoms__entries li:nth-child(even) { background: #f8faf9; }
        .profile-symptoms__entries li:hover { background: #eef4f6; }
        .profile-symptoms__entries .sev--severe { background: #f8d8d6; color: #8a211b; }
        .analysis-chart { overflow-x: auto; }
        .analysis-chart svg { display: block; width: 100%; min-width: 610px; }
        .analysis-chart svg text { fill: #566878; font-size: 10px; }
        .analysis-summary, .analysis-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .analysis-label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; }
        .analysis-value { display: block; font-size: 21px; margin-block: 4px; }
        .analysis-method { display: flex; flex-direction: column; }
        .analysis-footer { margin-top: auto; }
        @media (max-width: 760px) { .analysis-summary { grid-template-columns: 1fr; } }
        .profile-symptoms { display: grid; grid-template-columns: minmax(0, 3fr) minmax(235px, 1fr); gap: 14px; align-items: start; }
        .profile-symptoms__aside { display: grid; gap: 12px; }
        .profile-symptoms__header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
        .profile-symptoms__header .btn { border-radius: 999px; }
        .profile-symptoms__entries.card { padding: 0; min-height: 450px; overflow: hidden; }
        .profile-symptoms__entries ul { list-style: none; padding: 0; margin: 0; }
        .profile-symptoms__entries li { display: grid; grid-template-columns: minmax(83px, .8fr) minmax(58px, .7fr) minmax(0, 4fr) auto; gap: 12px; align-items: start; padding: 14px 16px; }
        .profile-symptoms__entries li + li { border-top: 1px solid var(--line, #deded9); }
        .profile-symptoms__entries p { margin: 4px 0 0; overflow-wrap: anywhere; }
        .profile-symptoms__entries .sev { display: inline-block; padding: 3px 8px; border-radius: 999px; color: #171c22; font-size: 11px; }
        .profile-symptoms__entries .sev--mild { background: #9acf36; }
        .profile-symptoms__entries .sev--moderate { background: #f0c42e; }
        .profile-symptoms .symptom-chip { display: inline-block; justify-self: start; border-radius: 999px; padding: 3px 8px; font-size: 11px; background: #efeee9; color: #242a30; }
        .profile-symptoms .correlation-chip { background: #42a5df; }
        .profile-symptoms__days { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .profile-symptoms__days .symptom-chip { background: #f9e7e4; color: #8a211b; }
        .profile-symptoms__cabin { border-top: 1px solid var(--line, #deded9); margin-top: 14px; padding-top: 12px; }
        @media (max-width: 760px) { .profile-symptoms { grid-template-columns: 1fr; } }
        @media (max-width: 450px) {
          .profile-symptoms__entries li { grid-template-columns: 1fr auto; gap: 5px 10px; }
          .profile-symptoms__entries li > div { grid-row: 2; }
        }
      `}</style>
      <div className="body-grid">
        <ProfileBodyMap tab={tab} onSelectTab={setTab} onLogSymptom={onLogSymptom}>
          {tab === 'live' && (
            <>
              {VITALS.map((k) => (
                <VitalCard
                  key={k}
                  evaluation={byKey[k]}
                  values={series[k]}
                  personal={RANGES[k].personal}
                  general={RANGES[k].general}
                  digits={RANGES[k].digits}
                  sampleAt={current.t}
                />
              ))}
              <div className="body-grid__console"><SensorConsole /></div>
            </>
          )}
          {tab === 'analysis' && <AnalysisPanel />}
          {tab === 'symptoms' && <SymptomsPanel onLogSymptom={onLogSymptom} />}
          {tab === 'measure' && <MeasureGuide />}
        </ProfileBodyMap>
      </div>
    </div>
  );
}
