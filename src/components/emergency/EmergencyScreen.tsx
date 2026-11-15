import { useEffect, useMemo, useRef, useState } from 'react';
import { GuidedCamera } from '../symptom-log/GuidedCamera';
import { downloadJson, downloadPdf } from '../symptom-log/exportReport';
import type { CapturedPhoto, CrewMember, IndicatorStatus, SensorReading, Severity, SymptomReport } from '../symptom-log/types';
import type { Status } from '../../utils/types';
import { evaluateSample, roundSample } from '../../utils/baselines';
import { clock } from '../../utils/format';
import { speak, stopSpeaking } from '../../utils/tts';
import { useVitals } from '../../utils/VitalsContext';
import Icon from '../ui/Icon';
import StatusPill from '../ui/StatusPill';
import { GUIDES, suggestedGuide, type EmergencyGuide, type GuideIcon, type GuidePriority } from './emergencyGuides';
import './emergency.css';

/** The symptom-log report plus the emergency details. Still readable by downloadPdf / downloadJson. */
export type EmergencyReport = SymptomReport & {
  emergency: {
    guideId: string;
    guideTitle: string;
    priority: GuidePriority;
    startedAt: string;
    stepsDone: string[];
    timeline: { at: string; text: string }[];
  };
};

interface EmergencyScreenProps {
  open: boolean;
  onClose: () => void;
  crew: CrewMember;
  /** Sends the report to the flight surgeon. Default: simulated downlink. */
  onSend?: (report: EmergencyReport) => Promise<void>;
}

type Step = 'triage' | 'guide' | 'report';
type SendState = 'idle' | 'sending' | 'sent' | 'kept' | 'error';

const SEVERITY: Record<GuidePriority, Severity> = { critical: 9, urgent: 6, minor: 3 };

const toIndicator = (s: Status): IndicatorStatus =>
  s === 'normal' ? 'normal' : s === 'advisory' ? 'advisory' : s === 'caution' ? 'caution' : 'warning';

const simulatedDownlink = () => new Promise<void>((resolve) => window.setTimeout(resolve, 1400));

function GuideGlyph({ icon }: { icon: GuideIcon }) {
  const d: Record<GuideIcon, string> = {
    breath: 'M3 8h10a3 3 0 1 0-3-3 M3 12h15a3 3 0 1 1-3 3 M3 16h7',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z M7 12h2.5l1.5-2.5 2 4 1.5-1.5H17',
    shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M12 8v5 M12 16v.3',
    drop: 'M9 4s4 4.5 4 7.5a4 4 0 0 1-8 0C5 8.5 9 4 9 4z M16 10s3 3.3 3 5.5a3 3 0 0 1-6 0',
    brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 9 17v3h6v-3a3 3 0 0 0 4-4.5A3 3 0 0 0 18 7a3 3 0 0 0-3-3 3 3 0 0 0-3 1.5A3 3 0 0 0 9 4z M12 6v14',
    help: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6 M12 17v.3',
    dot: 'M12 8v8 M8 12h8',
  };
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d[icon]} />
    </svg>
  );
}

export default function EmergencyScreen({ open, onClose, crew, onSend = simulatedDownlink }: EmergencyScreenProps) {
  const { current, evaluations } = useVitals();
  const [step, setStep] = useState<Step>('triage');
  const [guide, setGuide] = useState<EmergencyGuide | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [startedAt] = useState<string>(() => new Date().toISOString());
  const [done, setDone] = useState<Record<string, string>>({}); // step → time ticked
  const [timeline, setTimeline] = useState<{ at: string; text: string }[]>(() => [
    { at: new Date().toISOString(), text: 'Emergency screen opened' },
  ]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoChoice, setPhotoChoice] = useState<'undecided' | 'yes' | 'no'>('undecided');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [report, setReport] = useState<EmergencyReport | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const suggestion = useMemo(() => suggestedGuide(evaluations), [evaluations]);
  const primary = GUIDES.filter((g) => g.primary);
  const more = GUIDES.filter((g) => !g.primary);

  const log = (text: string) => setTimeline((t) => [...t, { at: new Date().toISOString(), text }]);

  // State starts fresh each time because App only mounts this while it's open
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Lock page scroll; Esc closes (but not while the camera is open)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cameraOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      stopSpeaking();
    };
  }, [open, cameraOpen, onClose]);

  if (!open) return null;

  const pickGuide = (g: EmergencyGuide) => {
    setGuide(g);
    setStep('guide');
    log(`Guide opened: ${g.title}`);
  };

  const toggleStep = (text: string) => {
    setDone((d) => {
      const next = { ...d };
      if (next[text]) delete next[text];
      else {
        next[text] = new Date().toISOString();
        log(`Done: ${text}`);
      }
      return next;
    });
  };

  const readAloud = (g: EmergencyGuide) =>
    speak(`${g.title}. Do now: ${g.doNow.join('. ')}. If worse: ${g.ifWorse.join('. ')}.`, { interrupt: true });

  const snapshot = (): SensorReading[] => {
    const s = roundSample(current);
    const ev = Object.fromEntries(evaluateSample(current).map((e) => [e.key, toIndicator(e.status)]));
    const ts = new Date(s.t).toISOString();
    return [
      { kind: 'heart_rate', label: 'Heart rate', value: s.hr, unit: 'bpm', timestamp: ts, status: ev.hr },
      { kind: 'blood_pressure', label: 'Blood pressure', value: `${s.systolic}/${s.diastolic}`, unit: 'mmHg', timestamp: ts, status: ev.bp },
      { kind: 'spo2', label: 'SpO₂', value: s.spo2, unit: '%', timestamp: ts, status: ev.spo2 },
      { kind: 'body_temperature', label: 'Body temperature', value: s.temp, unit: '°C', timestamp: ts, status: ev.temp },
    ];
  };

  const buildReport = (): EmergencyReport | null => {
    if (!guide) return null;
    const stepsDone = guide.doNow.filter((s) => done[s]);
    const timelineText = timeline.map((t) => `${clock(new Date(t.at))} ${t.text}`).join('\n');
    const r: EmergencyReport = {
      schemaVersion: 1,
      reportId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      crew,
      symptoms: [
        {
          id: crypto.randomUUID(),
          name: 'Other',
          customName: `EMERGENCY · ${guide.title}`,
          severity: SEVERITY[guide.priority],
          onset: startedAt,
          notes: stepsDone.length ? `Steps done: ${stepsDone.join('; ')}` : 'No steps ticked yet',
        },
      ],
      generalNotes: [notes.trim(), `Timeline:\n${timelineText}`].filter(Boolean).join('\n\n'),
      photos,
      sensorSnapshot: snapshot(),
      emergency: { guideId: guide.id, guideTitle: guide.title, priority: guide.priority, startedAt, stepsDone, timeline },
    };
    setReport(r);
    return r;
  };

  const send = async () => {
    const r = buildReport();
    if (!r) return;
    setSendState('sending');
    try {
      await onSend(r);
      setSendState('sent');
      log('Report sent to flight surgeon');
    } catch {
      setSendState('error');
    }
  };

  const keep = () => {
    buildReport();
    setSendState('kept');
    log('Report kept on board (not sent)');
  };

  /* ---------------- Camera (full screen, from symptom-log) ---------------- */
  if (cameraOpen) {
    return (
      <GuidedCamera
        onClose={() => setCameraOpen(false)}
        onCapture={(p) => {
          setPhotos((prev) => [...prev, { ...p, caption: guide ? `Emergency · ${guide.title}` : undefined }]);
          setCameraOpen(false);
          log('Photo added');
        }}
      />
    );
  }

  const liveStrip = (
    <div className="em-live">
      {evaluations.map((e) => (
        <div key={e.key} className={`em-live__item em-live__item--${e.status}`}>
          <span className="em-live__label">{e.label}</span>
          <span className="em-live__value">
            {e.valueText}
            <small>{e.unit}</small>
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="em theme-dark" role="dialog" aria-modal="true" aria-labelledby="em-title">
      <div className="em__inner">
        <header className="em__head">
          <div>
            <p className="eyebrow em__eyebrow">
              Emergency · {step === 'triage' ? 'Triage' : step === 'guide' ? 'Guide' : 'Report'}
            </p>
            <h1 id="em-title" className="em__title">
              {step === 'triage' ? 'What do you see?' : step === 'guide' ? guide?.title : 'Your emergency report'}
            </h1>
            <p className="em__sub">
              {step === 'triage'
                ? 'Pick the closest match. You can switch guides at any time — nothing is sent to Earth until the link returns.'
                : step === 'guide'
                  ? 'Tick each step as you do it. Maia records the time of everything for the report.'
                  : 'Add a photo if it helps, then decide whether to send it to your flight surgeon.'}
            </p>
          </div>
          <button ref={closeRef} type="button" className="em-close" onClick={onClose}>
            <Icon name="x" />
            Close
          </button>
        </header>

        {/* ============ 1. TRIAGE ============ */}
        {step === 'triage' && (
          <>
            <div className="em-grid">
              {primary.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`em-card ${suggestion === g.id ? 'is-suggested' : ''}`}
                  onClick={() => pickGuide(g)}
                >
                  <span className="em-card__icon">
                    <GuideGlyph icon={g.icon} />
                  </span>
                  <Icon name="chevron" className="em-card__chev" />
                  <span className="em-card__text">
                    <strong>{g.title}</strong>
                    <span>{g.subtitle}</span>
                    {suggestion === g.id && <span className="em-card__why">Suggested from your live sensors</span>}
                  </span>
                </button>
              ))}
            </div>

            <button type="button" className="em-more-toggle" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
              {showAll ? 'Hide' : 'Show'} all {GUIDES.length} guides
              <Icon name="chevronDown" size={14} style={{ transform: showAll ? 'rotate(180deg)' : undefined }} />
            </button>
            {showAll && (
              <div className="em-list">
                {more.map((g) => (
                  <button key={g.id} type="button" className={`em-list__item ${suggestion === g.id ? 'is-suggested' : ''}`} onClick={() => pickGuide(g)}>
                    {g.title}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ============ 2. GUIDE ============ */}
        {step === 'guide' && guide && (
          <div className="em-guide">
            <div className="em-guide__main">
              <section className="em-panel em-panel--do">
                <div className="em-panel__head">
                  <h2>Do now</h2>
                  <button type="button" className="em-ghost" onClick={() => readAloud(guide)}>
                    <Icon name="volume" /> Read aloud
                  </button>
                </div>
                <ol className="em-steps">
                  {guide.doNow.map((s) => (
                    <li key={s}>
                      <button type="button" className={`em-step ${done[s] ? 'is-done' : ''}`} onClick={() => toggleStep(s)} aria-pressed={!!done[s]}>
                        <span className="em-step__box">{done[s] && <Icon name="check" size={18} strokeWidth={3} />}</span>
                        <span className="em-step__text">{s}</span>
                        {done[s] && <span className="em-step__time">{clock(new Date(done[s]))}</span>}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="em-two">
                <section className="em-panel">
                  <h2>Watch</h2>
                  <ul>
                    {guide.watch.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </section>
                <section className="em-panel em-panel--worse">
                  <h2>If it gets worse</h2>
                  <ul>
                    {guide.ifWorse.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <label className="em-notes">
                <span>What happened? (optional)</span>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. hit the hatch edge during translation, 2 cm cut on left forearm" />
              </label>
            </div>

            <aside className="em-guide__side">
              <section className="em-panel">
                <h2>Live signals</h2>
                {liveStrip}
              </section>
              {guide.kit.length > 0 && (
                <section className="em-panel">
                  <h2>From the kit</h2>
                  <ul className="em-kit">
                    {guide.kit.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="em-panel">
                <h2>Timeline</h2>
                <ul className="em-timeline">
                  {timeline.map((t, i) => (
                    <li key={i}>
                      <span>{clock(new Date(t.at))}</span>
                      {t.text}
                    </li>
                  ))}
                </ul>
              </section>
              {guide.source === 'demo' && <p className="em-demo">Demo guide — steps not yet validated against a medical source.</p>}
            </aside>

            <footer className="em-footer">
              <button type="button" className="em-ghost" onClick={() => setStep('triage')}>
                ← Switch guide
              </button>
              <button type="button" className="em-primary" onClick={() => { setStep('report'); log('Moved to report'); }}>
                Continue to report
                <Icon name="chevron" />
              </button>
            </footer>
          </div>
        )}

        {/* ============ 3. REPORT ============ */}
        {step === 'report' && guide && (
          <div className="em-report">
            <section className="em-panel em-summary">
              <div className="em-summary__row">
                <strong>{guide.title}</strong>
                <StatusPill status={guide.priority === 'critical' ? 'critical' : guide.priority === 'urgent' ? 'warning' : 'caution'} label={guide.priority} size="sm" />
              </div>
              <p className="em-summary__meta">
                Started {clock(new Date(startedAt))} · {Object.keys(done).length} of {guide.doNow.length} steps done · {photos.length} photo{photos.length === 1 ? '' : 's'}
              </p>
              {liveStrip}
            </section>

            {/* Question 1 — photo (optional) */}
            <section className="em-question">
              <h2>
                <span className="em-question__num">1</span> Add a photo to the report?
              </h2>
              <p className="em-question__hint">Optional. Useful for wounds, burns, rashes or swelling. The camera guides you to a clear shot.</p>
              {photos.length > 0 && (
                <div className="em-photos">
                  {photos.map((p) => (
                    <figure key={p.id}>
                      <img src={p.dataUrl} alt={p.caption ?? 'Emergency photo'} />
                      <button type="button" className="em-ghost" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}>
                        Remove
                      </button>
                    </figure>
                  ))}
                </div>
              )}
              <div className="em-choices">
                <button
                  type="button"
                  className={`em-choice em-choice--yes ${photoChoice === 'yes' ? 'is-picked' : ''}`}
                  onClick={() => {
                    setPhotoChoice('yes');
                    setCameraOpen(true);
                  }}
                >
                  <span className="em-choice__big">{photos.length ? 'Take another photo' : 'Yes, take a photo'}</span>
                  <span>Opens the guided camera</span>
                </button>
                <button type="button" className={`em-choice ${photoChoice === 'no' ? 'is-picked' : ''}`} onClick={() => setPhotoChoice('no')}>
                  <span className="em-choice__big">{photos.length ? 'Done with photos' : 'No photo'}</span>
                  <span>Send the report without one</span>
                </button>
              </div>
            </section>

            {/* Question 2 — send */}
            <section className="em-question">
              <h2>
                <span className="em-question__num">2</span> Send this report to your flight surgeon?
              </h2>
              <p className="em-question__hint">
                Includes the guide, steps and times, your notes, live vitals{photos.length ? ' and photos' : ''}. If there is no signal it waits for the next downlink.
              </p>

              {sendState === 'sent' ? (
                <div className="em-result em-result--ok">
                  <Icon name="check" size={22} strokeWidth={3} />
                  <div>
                    <strong>Sent to your flight surgeon</strong>
                    <p>Keep following the guide. You can close this screen.</p>
                  </div>
                </div>
              ) : (
                <div className="em-choices">
                  <button type="button" className="em-choice em-choice--send" disabled={sendState === 'sending'} onClick={send}>
                    <span className="em-choice__big">{sendState === 'sending' ? 'Sending…' : 'Yes, send now'}</span>
                    <span>{photos.length ? `With ${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'No photo needed'}</span>
                  </button>
                  <button type="button" className={`em-choice ${sendState === 'kept' ? 'is-picked' : ''}`} onClick={keep}>
                    <span className="em-choice__big">Not now</span>
                    <span>Keep it on board</span>
                  </button>
                </div>
              )}
              {sendState === 'error' && <p className="em-error">Couldn’t send. The report is kept — try again or download it.</p>}
              {sendState === 'kept' && <p className="em-question__hint">Kept on board. You can still send it or download a copy.</p>}

              {report && (
                <div className="em-downloads">
                  <button type="button" className="em-ghost" onClick={() => downloadPdf(report)}>
                    Download PDF
                  </button>
                  <button type="button" className="em-ghost" onClick={() => downloadJson(report)}>
                    Download JSON
                  </button>
                </div>
              )}
            </section>

            <footer className="em-footer">
              <button type="button" className="em-ghost" onClick={() => setStep('guide')}>
                ← Back to guide
              </button>
              {sendState === 'sent' && (
                <button type="button" className="em-primary" onClick={onClose}>
                  Close
                </button>
              )}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
