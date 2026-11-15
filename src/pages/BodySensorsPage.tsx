import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Range, VitalEvaluation, VitalKey } from '../utils/types';
import { GENERAL_REF, PERSONAL_NORMAL } from '../utils/baselines';
import { AvatarPortrait } from './Initial record/AboutyouPage';
import { useVitals } from '../utils/VitalsContext';
import PageHeader from '../components/ui/PageHeader';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import Card from '../components/ui/Card';
import VitalCard from '../components/body/VitalCard';
import SensorConsole from '../components/body/SensorConsole';
import DeviationTable from '../components/body/DeviationTable';
import SymptomZones from '../components/body/SymptomZones';
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

function ProfileBodyMap({ onLogSymptom }: { onLogSymptom: () => void }) {
  const [profile] = useState(readProfile);
  const [orbit, setOrbit] = useState(false);
  const [zoneId, setZoneId] = useState<string>('heart');
  const [measureId, setMeasureId] = useState('heart');
  const [result, setResult] = useState('');
  const [feedback, setFeedback] = useState('');
  const [dailyLog, setDailyLog] = useState(() => readDailyLog(new Date().toDateString()));
  const dialog = useRef<HTMLDialogElement>(null);
  const today = new Date().toDateString();
  const readings = dailyLog.date === today ? dailyLog.readings : {};
  const selected = zones.find((zone) => zone.id === zoneId);
  const measurement = zones.find((zone) => zone.id === measureId) ?? zones[3];

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
      setZoneId(measureId);
      setFeedback('Reading saved on this device.');
    } catch {
      setFeedback('This browser could not save the reading.');
    }
  }

  return (
    <Card className="body-grid__map" title="Body map · 10 zones" aside={<span>Tap a zone</span>}>
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
                onClick={() => setZoneId(zone.id)}
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
        {orbit && <button type="button" className="btn btn--secondary" aria-pressed={zoneId === 'eva'} onClick={() => setZoneId('eva')}>Suit life support</button>}
      </div>
      {selected && (
        <section className="zone-detail" aria-live="polite">
          <strong>{selected.label}</strong>
          <p className="zone-detail__reading mono">{selected.value} {selected.unit}</p>
          <p className="small muted">Demo reading · {selected.measure} · {selected.trend}</p>
          {readings[selected.id] && <p className="small">My reading · {readings[selected.id].value} · {readings[selected.id].time}</p>}
          <p className="small"><strong>Sensor or record:</strong> {selected.sensor}</p>
          <p className="small">{orbit ? selected.space : selected.earth}</p>
          <p className="small muted">{selected.action}</p>
          <a className="small" href={selected.source} target="_blank" rel="noreferrer">View source</a>
        </section>
      )}
      {orbit && zoneId === 'eva' && (
        <section className="zone-detail" aria-live="polite">
          <strong>Suit life support</strong>
          <p className="zone-detail__reading mono">78% oxygen reserve</p>
          <p className="small muted">Simulated suit telemetry · Oxygen, pressure, and carbon dioxide are tracked separately.</p>
        </section>
      )}
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
    </Card>
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

      {tab === 'live' && (
        <div className="body-grid">
          <ProfileBodyMap onLogSymptom={onLogSymptom} />

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

          <div className="body-grid__console">
            <SensorConsole />
          </div>
        </div>
      )}

      {tab === 'analysis' && <DeviationTable />}
      {tab === 'symptoms' && <SymptomZones onLogSymptom={onLogSymptom} />}
      {tab === 'measure' && <MeasureGuide />}
    </div>
  );
}
