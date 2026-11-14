import { useState } from 'react';
import { GuidedCamera } from './GuidedCamera';
import { downloadJson, downloadPdf } from './exportReport';
import {
  SYMPTOM_OPTIONS,
  type CapturedPhoto,
  type CrewMember,
  type SensorReading,
  type Severity,
  type SymptomEntry,
  type SymptomName,
  type SymptomReport,
} from './types';
import './symptomLog.css';

interface Props {
  crew: CrewMember;
  /** Called when the report is built. Hook your sensor store or API up here. */
  getSensorSnapshot: () => SensorReading[] | Promise<SensorReading[]>;
  /** Optional: sends the report to your backend or ground link. */
  onSubmit?: (report: SymptomReport) => Promise<void>;
}

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // value for <input type="datetime-local">
};

export function SymptomLogger({ crew, getSensorSnapshot, onSubmit }: Props) {
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [report, setReport] = useState<SymptomReport | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const toggleSymptom = (name: SymptomName) => {
    setSymptoms((prev) =>
      prev.some((s) => s.name === name)
        ? prev.filter((s) => s.name !== name)
        : [...prev, { id: crypto.randomUUID(), name, severity: 3, onset: nowLocal() }],
    );
  };

  const updateSymptom = (id: string, patch: Partial<SymptomEntry>) =>
    setSymptoms((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const updatePhoto = (id: string, patch: Partial<CapturedPhoto>) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const buildReport = async () => {
    const r: SymptomReport = {
      schemaVersion: 1,
      reportId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      crew,
      symptoms: symptoms.map((s) => ({ ...s, onset: new Date(s.onset).toISOString() })),
      generalNotes: generalNotes.trim() || undefined,
      photos,
      sensorSnapshot: await getSensorSnapshot(),
    };
    setReport(r);
    setStatus('idle');
    return r;
  };

  const send = async () => {
    if (!onSubmit) return;
    const r = report ?? (await buildReport());
    setStatus('sending');
    try {
      await onSubmit(r);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const canBuild = symptoms.length > 0 || photos.length > 0 || generalNotes.trim() !== '';

  if (cameraOpen) {
    return (
      <GuidedCamera
        onClose={() => setCameraOpen(false)}
        onCapture={(p) => {
          setPhotos((prev) => [...prev, p]);
          setCameraOpen(false);
        }}
      />
    );
  }

  return (
    <section className="sl-card" aria-labelledby="sl-title">
      <h2 id="sl-title">How are you feeling?</h2>

      <fieldset className="sl-section">
        <legend>Select any symptoms</legend>
        <div className="sl-chips">
          {SYMPTOM_OPTIONS.map((name) => {
            const on = symptoms.some((s) => s.name === name);
            return (
              <button key={name} type="button" className="sl-chip" aria-pressed={on} onClick={() => toggleSymptom(name)}>
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {symptoms.map((s) => (
        <div key={s.id} className="sl-symptom">
          <h3>{s.name}</h3>
          {s.name === 'Other' && (
            <label>Describe
              <input value={s.customName ?? ''} onChange={(e) => updateSymptom(s.id, { customName: e.target.value })} />
            </label>
          )}
          <label>
            Severity <strong data-level={s.severity >= 7 ? 'warning' : s.severity >= 4 ? 'caution' : 'normal'}>{s.severity}/10</strong>
            <input
              type="range" min={0} max={10} step={1} value={s.severity}
              onChange={(e) => updateSymptom(s.id, { severity: Number(e.target.value) as Severity })}
            />
          </label>
          <div className="sl-row">
            <label>Started
              <input type="datetime-local" value={s.onset} onChange={(e) => updateSymptom(s.id, { onset: e.target.value })} />
            </label>
            <label>Where on your body?
              <input placeholder="e.g. left forearm" value={s.bodyLocation ?? ''} onChange={(e) => updateSymptom(s.id, { bodyLocation: e.target.value })} />
            </label>
          </div>
          <label>Notes
            <textarea rows={2} value={s.notes ?? ''} onChange={(e) => updateSymptom(s.id, { notes: e.target.value })} />
          </label>
        </div>
      ))}

      <div className="sl-section">
        <h3>Photos</h3>
        <p className="sl-hint">Photograph rashes, bruises, swelling or other visible changes. The camera will guide you.</p>
        <div className="sl-photos">
          {photos.map((p) => (
            <figure key={p.id} className="sl-photo">
              <img src={p.dataUrl} alt={p.caption || 'Symptom photo'} />
              <input placeholder="Body location" value={p.bodyLocation ?? ''} onChange={(e) => updatePhoto(p.id, { bodyLocation: e.target.value })} />
              <input placeholder="Caption" value={p.caption ?? ''} onChange={(e) => updatePhoto(p.id, { caption: e.target.value })} />
              <button type="button" className="sl-btn sl-btn--ghost" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}>Remove</button>
            </figure>
          ))}
        </div>
        <button type="button" className="sl-btn" onClick={() => setCameraOpen(true)}>Take a photo</button>
      </div>

      <label className="sl-section">General notes
        <textarea rows={3} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
      </label>

      <div className="sl-actions">
        <button type="button" className="sl-btn" disabled={!canBuild} onClick={buildReport}>Prepare report</button>
        {report && (
          <>
            <button type="button" className="sl-btn sl-btn--ghost" onClick={() => downloadPdf(report)}>Download PDF</button>
            <button type="button" className="sl-btn sl-btn--ghost" onClick={() => downloadJson(report)}>Download JSON</button>
            {onSubmit && (
              <button type="button" className="sl-btn" disabled={status === 'sending'} onClick={send}>
                {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent ✓' : 'Send to flight surgeon'}
              </button>
            )}
          </>
        )}
      </div>
      {status === 'error' && <p className="sl-error">Couldn't send. The report has been kept, so try again or download it.</p>}
    </section>
  );
}
