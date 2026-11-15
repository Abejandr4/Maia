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
import { bodyZones, daily as maiaDaily, immune as maiaImmune, measurementTexts, sourceLinks, symptomList } from '../data/maiaData';

/** Personal sleep band of the analysis (median ± 2.5 robust SD, days 8–21). */
const SLEEP_BAND = { min: maiaDaily.bands.sleep?.low ?? NaN, max: maiaDaily.bands.sleep?.high ?? NaN };
import EarthRecovery from '../components/body/EarthRecovery';
import SpacewalkCard from '../components/body/SpacewalkCard';
import PlacePreview from '../components/body/PlacePreview';
import MeasureGuide, { RecordedMeasurements } from '../components/body/MeasureGuide';
import './pages.css';

type BodyTab = 'live' | 'analysis' | 'symptoms' | 'measure';

const VITALS: VitalKey[] = ['bp', 'hr', 'spo2', 'temp'];

const RANGES: Record<VitalKey, { personal: Range; general: Range; digits: number }> = {
  bp: { personal: PERSONAL_NORMAL.systolic, general: GENERAL_REF.systolic, digits: 0 },
  hr: { personal: PERSONAL_NORMAL.hr, general: GENERAL_REF.hr, digits: 0 },
  spo2: { personal: PERSONAL_NORMAL.spo2, general: GENERAL_REF.spo2, digits: 0 },
  temp: { personal: PERSONAL_NORMAL.temp, general: GENERAL_REF.temp, digits: 1 },
};

const fmtDay = (v: number | undefined, d: number) => (v != null && Number.isFinite(v) ? v.toFixed(d) : '—');
const IMMUNE_TREND = (() => {
  const t = maiaImmune.timeline.find((d) => d.day === TODAY_DAY);
  return t?.immune_review ? `${t.n_domains} of 4 immune domains · review` : 'No immune review';
})();

const ZONE_DEMO = [
  {"id": "brain", "label": "Brain", "point": [43, 6], "orbit": [48, 6], "measure": "Sleep logged", "value": fmtDay(MISSION_DAYS.at(-1)?.sleep, 1), "unit": "h", "trend": `Last night · your band ${SLEEP_BAND.min.toFixed(1)}–${SLEEP_BAND.max.toFixed(1)} h`, "sensor": "Sleep log", "action": "Record how you felt when you woke up.", "earth": "Rest provides context for attention and performance.", "space": "Changes in light and schedules can shift sleep patterns.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "eyes", "label": "Eyes", "point": [52, 11], "orbit": [55, 13], "measure": "Near focus", "value": "No change", "unit": "", "trend": "Same as last reading", "sensor": "Visual self-report", "action": "Record when a change started and which eye you notice it in.", "earth": "Compare your focus in familiar lighting.", "space": "Fluid shifts in microgravity can affect vision.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "ears", "label": "Ears", "point": [35, 16], "orbit": [35, 17], "measure": "Perceived balance", "value": "No dizziness", "unit": "", "trend": "Same as last reading", "sensor": "Vestibular self-report", "action": "Record whether symptoms occur during movement or a change in position.", "earth": "The inner ear helps with balance and orientation.", "space": "Gravity changes can affect how the body orients itself.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "heart", "label": "Heart", "point": [55, 27], "orbit": [55, 27], "measure": "Resting heart rate", "value": fmtDay(MISSION_DAYS.at(-1)?.hr, 0), "unit": "bpm", "trend": `Morning check D${TODAY_DAY} · your band ${PERSONAL_NORMAL.hr.min.toFixed(0)}–${PERSONAL_NORMAL.hr.max.toFixed(0)} bpm`, "sensor": "Heart-rate monitor", "action": "Compare readings taken at rest under similar conditions.", "earth": "Recent activity and your baseline help explain a pulse reading.", "space": "The cardiovascular system adapts to fluid shifts in orbit.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "lungs", "label": "Lungs", "point": [44, 32], "orbit": [42, 33], "measure": "Respiratory rate", "value": "Not measured", "unit": "", "trend": "No respiratory data in this demo", "sensor": "Respiratory band", "action": "Record whether you were resting or active.", "earth": "Respiratory rate is measured in breaths per minute.", "space": "Cabin conditions and respiratory readings are tracked separately.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "bones", "label": "Bones", "point": [41, 76], "orbit": [62, 76], "measure": "Bone mineral density", "value": "Not measured", "unit": "", "trend": "No comparison available", "sensor": "Clinical densitometry", "action": "Check the date of your last assessment with the medical team.", "earth": "Bone-density scans can show changes between assessments.", "space": "Reduced loading in microgravity can accelerate bone mineral loss.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "muscles", "label": "Muscles", "point": [58, 64], "orbit": [41, 65], "measure": "Exercise logged", "value": "Log it", "unit": "", "trend": "No exercise logged yet today", "sensor": "Training log", "action": "Record duration and perceived effort.", "earth": "Training duration describes a session. Strength is assessed separately.", "space": "Exercise helps maintain muscle function during reduced loading.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "kidneys", "label": "Kidneys", "point": [48, 37], "orbit": [48, 41], "measure": "Fluid intake logged", "value": "Log it", "unit": "", "trend": "No drinks logged yet today", "sensor": "Intake log", "action": "Check whether your log includes all drinks up to the same time.", "earth": "Recorded intake helps track hydration.", "space": "Dehydration and increased urinary calcium can contribute to kidney stones.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "skin", "label": "Skin", "point": [29, 48], "orbit": [26, 52], "measure": "Skin observation", "value": maiaDaily.events.some((e) => e.id === 'rash' && e.day <= TODAY_DAY) ? 'Rash logged' : 'No change', "unit": "", "trend": "From your symptom log", "sensor": "Inspection and self-report", "action": "Record the location and timing of any observed change.", "earth": "Describe the same area for comparison next time.", "space": "A dosimeter measures radiation exposure during the mission.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
  {"id": "immune", "label": "Immune system", "point": [58, 47], "orbit": [64, 48], "measure": "Symptoms logged", "value": String(maiaDaily.events.filter((e) => e.kind === 'symptom' && e.day <= TODAY_DAY).length), "unit": "reports", "trend": IMMUNE_TREND, "sensor": "Symptom log", "action": "Record when symptoms began and report persistent symptoms.", "earth": "Clinical assessment is needed to evaluate immune function.", "space": "The enclosed environment and flight stressors can affect immune response.", "source": "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"},
];

/**
 * Single source for the body map: body_zones.csv (+ symptoms.csv, measurements.csv).
 * ZONE_DEMO only keeps the dot positions tuned to the avatar images and today's reading.
 */
const SYMPTOM_NAME = Object.fromEntries(symptomList.map((x) => [x.id, x.name]));
const zones = ZONE_DEMO.map((z) => {
  const row = bodyZones.find((b) => b.id === z.id);
  if (!row) return { ...z, risks: [] as string[], symptoms: [] as string[], measures: [] as string[], care: '', eva: '', sources: [] as ReturnType<typeof sourceLinks>, evidence: '' };
  const firstLink = sourceLinks(row.source).find((x) => x.link)?.link;
  return {
    ...z,
    label: row.name,
    space: row.what_space_does,
    earth: row.what_affects_it_on_earth,
    action: row.how_to_care,
    care: row.how_to_care,
    eva: row.eva_focus,
    risks: row.nasa_risks.split('|').filter(Boolean),
    symptoms: row.symptoms.split('|').filter(Boolean).map((id) => SYMPTOM_NAME[id] ?? id.replaceAll('_', ' ')),
    measures: (row.measurements ?? '').split('|').filter(Boolean).map((id) => measurementTexts[id]?.name ?? id.replaceAll('_', ' ')),
    sources: sourceLinks(row.source),
    evidence: row.evidence_level,
    source: firstLink ?? z.source,
  };
});
const HR_LAST7 = MISSION_DAYS.slice(-7).map((d) => d.hr).filter(Number.isFinite);
/** Symptom name (lower case) → body-zone label, from symptoms.csv. */
const SYMPTOM_ZONE: Record<string, string> = Object.fromEntries(symptomList.map((x) => [x.name.toLowerCase(), bodyZones.find((b) => b.id === x.zone)?.name ?? x.zone]));

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
  const { place } = useVitals();
  // Zone texts follow the location chosen in the top bar (in space vs back on Earth).
  const orbit = place !== 'earth';
  const [zoneId, setZoneId] = useState<string>('heart');
  const [showZoneAnalysis, setShowZoneAnalysis] = useState(false);
  const [measureId, setMeasureId] = useState('heart');
  const [result, setResult] = useState('');
  const [feedback, setFeedback] = useState('');
  const [dailyLog, setDailyLog] = useState(() => readDailyLog(new Date().toDateString()));
  const dialog = useRef<HTMLDialogElement>(null);
  const dailyReview = useRef<HTMLDialogElement>(null);
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
      <div className="bodymap-actions bodymap-actions--top">
        <button type="button" className="btn maia-solid-btn" onClick={() => dailyReview.current?.showModal()}>Daily measurements</button>
        <button type="button" className="btn maia-solid-btn" onClick={onLogSymptom}>+ Log a symptom</button>
      </div>
      <div style={{ marginBlock: 12, borderRadius: 12, background: '#f6f5f0' }}>
        <div role="group" aria-label="Body zones" style={{ position: 'relative', width: 'min(100%, 248px)', aspectRatio: '2 / 3', marginInline: 'auto' }}>
          <AvatarPortrait avatarId={profile.avatarId} tone={profile.tone} />
          {zones.map((zone, index) => {
            const [x, y] = zone.point;
            const chosen = zone.id === zoneId;
            return (
              <button
                key={zone.id}
                type="button"
                aria-label={`Zone ${index + 1}: ${zone.label}`}
                className="profile-body-zone"
                aria-pressed={chosen}
                title={zone.label}
                onClick={() => openAnalysis(zone.id)}
                style={{ position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%, -50%)', width: 22, height: 22, padding: 0, fontSize: 11, border: '1px solid #ffffff48', borderRadius: '50%', color: '#1c252a', fontWeight: 700, zIndex: chosen ? 1 : undefined }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div style={{ padding: '2px 8px 8px', fontSize: 10, color: '#000' }}>
          <span aria-hidden="true">✦ </span>AI-generated content
        </div>
      </div>
      <dialog ref={dailyReview} className="maia-dialog" aria-labelledby="daily-review-title">
        <p className="eyebrow" style={{ margin: 0 }}>Saved on this device</p>
        <h2 id="daily-review-title" className="maia-dialog__title">Daily measurements</h2>
        <RecordedMeasurements earlier={zones.flatMap((zone) => readings[zone.id] ? [{
          label: zone.measure, value: `${readings[zone.id].value} ${zone.unit} · ${readings[zone.id].time}`,
        }] : [])} />
        <div className="maia-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={() => dailyReview.current?.close()}>Close</button>
        </div>
      </dialog>
      <dialog ref={dialog} className="maia-dialog" aria-labelledby="avatar-measure-title">
        <form onSubmit={saveReading} style={{ display: 'grid', gap: 10 }}>
          <h2 id="avatar-measure-title" className="maia-dialog__title">Record a measurement</h2>
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
        {showZoneAnalysis && <Card title={selected?.label ?? 'Suit life support'} aside={<span>{orbit ? 'In space' : 'Back on Earth'}</span>}>
          {selected ? (
            <section className="zone-detail zone-v2" aria-live="polite">
              {/* 1 · today */}
              <div className="zone-v2__today">
                <div>
                  <p className="zone-v2__label">{selected.measure}</p>
                  <p className="zone-v2__value">{selected.value} <small>{selected.unit}</small></p>
                  <p className="zone-v2__meta">
                    {selected.value === 'Not measured' ? 'No reading available yet' : `Day ${TODAY_DAY} · sample data`} · {selected.trend}
                  </p>
                  {readings[selected.id] && (
                    <p className="zone-v2__mine">Your reading: <b>{readings[selected.id].value}</b> at {readings[selected.id].time}</p>
                  )}
                </div>
                {selected.id === 'heart' && (
                  <figure className="zone-v2__spark" aria-label="Last seven days of resting heart rate">
                    <Sparkline values={HR_LAST7} height={52} band={PERSONAL_NORMAL.hr} />
                    <figcaption>Last 7 days · band {PERSONAL_NORMAL.hr.min.toFixed(0)}–{PERSONAL_NORMAL.hr.max.toFixed(0)} bpm</figcaption>
                  </figure>
                )}
              </div>

              {/* 2 · three short facts */}
              <div className="zone-v2__facts">
                <div>
                  <h4>{orbit ? 'What space does' : 'What affects it on Earth'}</h4>
                  <p>{orbit ? selected.space : selected.earth}</p>
                </div>
                <div>
                  <h4>How to care for it</h4>
                  <p>{selected.care}</p>
                </div>
                {orbit && selected.eva && (
                  <div>
                    <h4>On a spacewalk</h4>
                    <p>{selected.eva}</p>
                  </div>
                )}
              </div>

              {/* 3 · what you can do */}
              {selected.symptoms.length > 0 && (
                <div className="zone-v2__do">
                  <h4>Feeling something here? Log it</h4>
                  <div className="zone-detail__chips">
                    {selected.symptoms.map((x) => <button key={x} type="button" className="zone-chip" onClick={onLogSymptom}>{x}</button>)}
                  </div>
                </div>
              )}
              <div className="zone-v2__actions">
                <button type="button" className="btn btn--secondary" onClick={openMeasurements}>Record this measurement</button>
              </div>

              {/* 4 · details for the curious / the doctor */}
              <details className="zone-v2__more">
                <summary>More details · how it is measured, NASA risks, sources</summary>
                <dl>
                  <dt>Sensor or record</dt>
                  <dd>{selected.sensor}</dd>
                  {selected.measures.length > 0 && (
                    <>
                      <dt>Measured with</dt>
                      <dd className="zone-v2__tags">{selected.measures.map((m) => <span key={m}>{m}</span>)}</dd>
                    </>
                  )}
                  {selected.risks.length > 0 && (
                    <>
                      <dt>NASA risks ({selected.risks.length})</dt>
                      <dd><ul>{selected.risks.map((r) => <li key={r}>{r}</li>)}</ul></dd>
                    </>
                  )}
                  <dt>Evidence</dt>
                  <dd>
                    {selected.evidence || '—'} · {selected.sources.length
                      ? selected.sources.map((x, i) => <span key={x.id}>{i > 0 && ', '}{x.link ? <a href={x.link} target="_blank" rel="noreferrer">{x.id} ↗</a> : x.id}</span>)
                      : <a href={selected.source} target="_blank" rel="noreferrer">View source ↗</a>}
                  </dd>
                </dl>
              </details>
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
  const zone: Record<string, string> = { ...SYMPTOM_ZONE, rash: 'Skin', headache: 'Brain', nausea: 'Abdomen', 'eye strain': 'Eyes', 'lower back pain': 'Bones' };
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
  // Daily values of the analysis (SAMPLE). Missing days stay missing: they are not drawn and never count as normal.
  const daily = MISSION_DAYS;
  const first = period === 'Mission' ? 1 : period === '7 days' ? TODAY_DAY - 6 : TODAY_DAY;
  const intraday = period === '24 h' && metric !== 'sleep';
  const now = Date.now();
  const since = now - 86400000;
  const visible = daily.filter((record) => record.day >= first && Number.isFinite(record[metric]));
  const points = intraday
    ? [...WEEK_SAMPLES, ...history].filter((sample) => sample.t >= since && sample.t <= now)
        .sort((a, b) => a.t - b.t).map((sample) => ({ value: sample[metric], position: (sample.t - since) / 86400000 }))
    : visible.map((record) => ({ value: record[metric], position: first === TODAY_DAY ? .5 : (record.day - first) / (TODAY_DAY - first) }));
  // learning window of the analysis: flight days 8–21 (days 1–7 skipped for adaptation)
  const baseline = daily.filter((record) => record.day >= 8 && record.day <= 21 && Number.isFinite(record[metric])).map((record) => record[metric]);
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const personal = metric === 'sleep' ? SLEEP_BAND : PERSONAL_NORMAL[metric];
  const general = metric === 'sleep' ? undefined : GENERAL_REF[metric];
  const outside = (value: number) => value < personal.min || value > personal.max;
  const lastSix = daily.slice(-6).filter((record) => Number.isFinite(record[metric]) && outside(record[metric])).length;
  const values = points.map(({ value }) => value);
  // Break the line where a day is missing, so a gap is never drawn as data.
  const segments = intraday ? [points] : visible.reduce<{ position: number; value: number }[][]>((acc, record, i) => {
    const p = points[i];
    if (i === 0 || record.day - visible[i - 1].day > 1) acc.push([p]); else acc[acc.length - 1].push(p);
    return acc;
  }, []);
  const activePoint = inspected === null ? undefined : points[inspected];
  const latest = values.at(-1);
  const status = lastSix >= 4 ? 'Change detected' : latest === undefined ? 'No readings' : outside(latest) ? 'Latest outside your band' : 'Inside your band';
  const countNormal = values.filter((value) => !outside(value)).length;
  const delta = average(daily.slice(-7).map((record) => record[metric]).filter(Number.isFinite)) - average(baseline);
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
    ...(first <= EVENTS.co2Rise && EVENTS.co2Rise <= TODAY_DAY ? [{ day: EVENTS.co2Rise, label: 'CO₂ peak' }] : [])];
  const summary = [
    ['Readings logged', String(values.length), 'Selected window'],
    ['Alerts raised', String(alertCount), label],
    ['Readings in personal range', values.length ? `${Math.round(100 * countNormal / values.length)}%` : '—', 'Selected window'],
    ['Change vs personal normal', `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`, 'Last 7 days vs. days 8–21'],
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
          <span data-key="band">Personal normal (days 8–21)</span>
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
            {events.map((event, i) => <g key={event.day}>
              <line x1={dayX(event.day)} x2={dayX(event.day)} y1="28" y2="183" stroke="#a6a8a7" strokeDasharray="3 3" />
              <text x={dayX(event.day)} y={i % 2 ? 26 : 14} textAnchor="middle">{event.label}</text>
            </g>)}
            {segments.map((seg, i) => <polyline key={i} points={seg.map(({ position, value }) => `${x(position)},${y(value)}`).join(' ')} fill="none" stroke="#191c20" strokeWidth="2" />)}
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
          <p className="small">Maia compares your readings with your personal range learned on flight days 8–21 (days 1–7 are skipped while your body adapts). It flags a change when <strong>4 or more of the last 6 days</strong> are outside that range.</p>
          <div className="analysis-footer"><span role="status" className="small muted">{exported ? 'Report summary downloaded' : 'Simulated mission data'}</span>
            <button className="btn maia-solid-btn" type="button" onClick={exportSummary}>Download report summary</button></div>
        </Card>
      </div>
    </section>
  );
}

export default function BodySensorsPage({ onLogSymptom }: { onLogSymptom: () => void }) {
  const { history, evaluations, place } = useVitals();
  const [tab, setTab] = useState<BodyTab>('live');
  const onEarth = place === 'earth';
  const preview = place === 'lunar' ? 'lunar_surface' : place === 'mars' ? 'mars_transit' : null;

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
        eyebrow={onEarth ? 'Back on Earth · re-adaptation after landing' : preview ? 'Preview · what changes in this place' : 'Personal normal · learned on days 8–21'}
        title="Body & Sensors"
        subtitle={onEarth ? 'Gravity is back: standing blood pressure, heart rate and sleep for the first 14 days.' : preview ? 'Gravity, signal delay, radiation and who Maia tells when something is off.' : 'Ten zones, four live signals. Every reading shows its age.'}
        aside={
          <SegmentedTabs<BodyTab>
            ariaLabel="Body view"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'analysis', label: 'Analysis' },
              { value: 'measure', label: 'Measure' },
            ]}
          />
        }
      />

      <style>{`
        .page--body .page-title { font-size: 48px; }
        .page--body h2 { font-size: 2.25em; }
        .page--body h3 { font-size: 1.755em; }
        .page--body .card__title { font-size: 16.5px; }
        .place-preview { grid-column: 2 / -1; display: grid; gap: 12px; min-width: 0; }
        @media (max-width: 1050px) { .place-preview { grid-column: 1 / -1; } }
        .place-preview__tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 760px) { .place-preview__tiles { grid-template-columns: 1fr; } }
        .place-tile { border-top: 3px solid #b8ccd5; }
        .place-tile--watch { border-top-color: #e3b51f; }
        .place-tile__value { font-family: var(--font-mono, monospace); font-size: 22px; font-weight: 600; margin-block: 6px 2px; }
        .place-tile__value small { font-size: 12px; color: #566878; }
        .place-tile p { margin: 0; }
        .place-preview__levels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 760px) { .place-preview__levels { grid-template-columns: 1fr; } }
        .place-preview__levels ol { margin: 4px 0 0; padding-left: 18px; display: grid; gap: 4px; font-size: 14px; }
        .place-preview__rules { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 14px; }
        .place-preview__rules li { display: flex; gap: 10px; align-items: baseline; }
        .place-rule__pill { border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 700; text-transform: uppercase; flex: none; }
        .place-rule__pill--yellow { background: #f8e9ad; color: #5f4600; } .place-rule__pill--red { background: #f8d8d6; color: #8a211b; } .place-rule__pill--green { background: #e8f3d6; color: #315314; }
        .earth-recovery { grid-column: 2 / -1; display: grid; gap: 12px; min-width: 0; }
        @media (max-width: 1050px) { .earth-recovery { grid-column: 1 / -1; } }
        .earth-recovery__tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 760px) { .earth-recovery__tiles { grid-template-columns: 1fr; } }
        .earth-tile { border-top: 3px solid #b8ccd5; }
        .earth-tile--green { border-top-color: #7fb43a; } .earth-tile--yellow { border-top-color: #e3b51f; } .earth-tile--red { border-top-color: #d2453a; }
        .earth-tile__value { font-family: var(--font-mono, monospace); font-size: 32px; font-weight: 600; margin-block: 4px; }
        .earth-tile__value small { font-size: 12px; color: #566878; }
        .earth-tile__pill { display: inline-block; border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 700; background: #eee; }
        .earth-tile__pill--green { background: #e8f3d6; color: #315314; } .earth-tile__pill--yellow { background: #f8e9ad; color: #5f4600; } .earth-tile__pill--red { background: #f8d8d6; color: #8a211b; }
        .spacewalk-card { background: linear-gradient(150deg, #eef4f6, #fff 60%); }
        .spacewalk-card__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
        @media (max-width: 760px) { .spacewalk-card__grid { grid-template-columns: 1fr; } }
        .spacewalk-card__h { font-size: 13px !important; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 8px; }
        .spacewalk-card__check { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .spacewalk-card__check li { display: grid; grid-template-columns: 1fr auto auto; gap: 2px 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid #e6e7e2; }
        .spacewalk-card__check li > .small { grid-column: 1 / -1; margin-top: -2px; }
        .spacewalk-card__check strong { font-family: var(--font-mono, monospace); font-size: 17px; }
        .spacewalk-card__check small { font-size: 11px; color: #566878; }
        .spacewalk-card__pill { border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 700; background: #eee; }
        .spacewalk-card__pill--green { background: #e8f3d6; color: #315314; } .spacewalk-card__pill--yellow { background: #f8e9ad; color: #5f4600; } .spacewalk-card__pill--red { background: #f8d8d6; color: #8a211b; }
        .spacewalk-card__expect { margin: 0 0 12px; padding-left: 18px; display: grid; gap: 5px; }
        .spacewalk-card__start { background: #0b1316; color: #b8f5e9; border-color: #0b1316; margin-left: auto; }
        .spacewalk-card__row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
        .zone-v2 { display: grid; gap: 16px; }
        .zone-v2 h4 { font-family: var(--font-mono, monospace); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .12em; color: #566878; margin: 0 0 6px; }
        .zone-v2__today { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 18px; align-items: center; }
        .zone-v2__today:has(> :only-child) { grid-template-columns: 1fr; }
        .zone-v2__label { margin: 0; font-size: 14px; color: #566878; }
        .zone-v2__value { margin: 2px 0; font-family: var(--font-mono, monospace); font-size: 34px; font-weight: 600; line-height: 1.1; }
        .zone-v2__value small { font-size: 15px; font-weight: 400; color: #566878; }
        .zone-v2__meta { margin: 0; font-size: 13px; color: #6b7a86; }
        .zone-v2__mine { margin: 6px 0 0; font-size: 13px; }
        .zone-v2__spark { margin: 0; }
        .zone-v2__spark figcaption { font-size: 12px; color: #6b7a86; margin-top: 4px; }
        .zone-v2__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
        .zone-v2__facts > div { background: #f6f7f4; border-radius: 12px; padding: 12px 14px; }
        .zone-v2__facts p { margin: 0; font-size: 14px; line-height: 1.45; }
        .zone-v2__do .zone-detail__chips { margin: 0; }
        .zone-v2__actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
        .zone-v2__actions .btn { width: 100%; justify-content: center; }
        .zone-v2__more { border-top: 1px solid #e6e7e2; padding-top: 10px; font-size: 13px; }
        .zone-v2__more > summary { cursor: pointer; color: #304859; font-weight: 600; }
        .zone-v2__more dl { display: grid; grid-template-columns: 150px 1fr; gap: 8px 14px; margin: 10px 0 0; }
        .zone-v2__more dt { font-weight: 600; color: #304859; }
        .zone-v2__more dd { margin: 0; color: #3b4650; }
        .zone-v2__more ul { margin: 0; padding-left: 18px; }
        .zone-v2__tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .zone-v2__tags span { border: 1px solid #deded9; border-radius: 999px; padding: 2px 9px; font-size: 12px; }
        @media (max-width: 640px) { .zone-v2__today { grid-template-columns: 1fr; } .zone-v2__more dl { grid-template-columns: 1fr; } }
        .demo-controls > summary { cursor: pointer; padding: 12px 16px; border: 1px dashed #b6c3c9; border-radius: 14px; font-weight: 650; color: #304859; }
        .demo-controls[open] > summary { margin-bottom: 10px; }
        .bodymap-actions--top { margin: 6px 0 4px; }
        .page--body .btn:not(.btn--secondary) { background: var(--text); color: var(--surface); border-color: var(--text); }
        /* solid black buttons: !important so no shared or glass button style can turn them white */
        .page--body .maia-solid-btn {
          background: #181816 !important; background-image: none !important; color: #ffffff !important;
          border: 1px solid #181816 !important; box-shadow: 0 4px 14px rgba(20, 20, 10, .18) !important;
          -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
          font-weight: 600; min-height: 46px; opacity: 1 !important;
        }
        .page--body .maia-solid-btn:hover { background: #2c2c29 !important; }
        .page--body .maia-solid-btn * { color: inherit !important; }
        .page--body .body-grid__map { align-self: start; }
        .maia-dialog { border: 0; border-radius: 18px; padding: 22px 24px; width: min(92vw, 520px); box-shadow: 0 20px 60px rgba(20, 20, 10, .25); background: var(--surface); color: var(--text); }
        .maia-dialog::backdrop { background: rgba(20, 22, 26, .35); backdrop-filter: blur(2px); }
        .maia-dialog__title { font-size: 26px !important; font-weight: 500; letter-spacing: -.01em; margin: 2px 0 14px; }
        .maia-dialog__actions { display: flex; justify-content: flex-end; margin-top: 16px; }
        .maia-dialog form { display: grid; gap: 12px; }
        .maia-dialog label { display: grid; gap: 6px; font-size: 14px; }
        .maia-dialog select, .maia-dialog input { font: inherit; padding: 9px 12px; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--surface); color: var(--text); }
        .recorded-list { list-style: none; margin: 0; padding: 0; display: grid; }
        .recorded-list li { display: grid; grid-template-columns: 1fr auto auto; grid-template-areas: 'name value pill' 'time time time'; gap: 2px 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .recorded-list li:last-child { border-bottom: 0; }
        .recorded-list__name { grid-area: name; font-weight: 600; font-size: 15px; }
        .recorded-list__value { grid-area: value; font-family: var(--font-mono, monospace); font-size: 15px; }
        .recorded-list__pill { grid-area: pill; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 600; background: var(--surface-3); color: var(--text-2); }
        .recorded-list__pill--green { background: var(--normal-soft); color: var(--normal-ink); }
        .recorded-list__pill--yellow { background: var(--caution-soft); color: var(--caution-ink); }
        .recorded-list__pill--red { background: var(--critical-soft); color: var(--critical-ink); }
        .recorded-list__time { grid-area: time; font-size: 12px; color: var(--text-3); }
        .bodymap-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-top: 4px; }
        .bodymap-actions .btn { width: 100%; justify-content: center; text-align: center; }
        .bodymap-actions__wide { grid-column: 1 / -1; }
        .zone-detail__chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-block: 6px; }
        .zone-chip { border: 1px solid #deded9; border-radius: 999px; padding: 3px 10px; background: #fff; font: inherit; font-size: 12px; cursor: pointer; color: inherit; }
        .zone-chip:hover { border-color: #688594; background: #eef4f6; }
        .profile-body-zone { background: #ffffff59; cursor: pointer; text-shadow: 0 0 2px #fff8; }
        .profile-body-zone:hover, .profile-body-zone:focus-visible { background: #fff; }
        .profile-body-zone[aria-pressed="true"] { box-shadow: 0 0 0 1px #ffffff9c; }
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
          {tab === 'live' && onEarth && <EarthRecovery />}
          {tab === 'live' && preview && <PlacePreview placeId={preview} />}
          {tab === 'live' && !onEarth && !preview && (
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
              <div className="body-grid__console"><SpacewalkCard /></div>
              <details className="body-grid__console demo-controls">
                <summary>Demo controls · simulate a sensor alert</summary>
                <SensorConsole />
              </details>
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
