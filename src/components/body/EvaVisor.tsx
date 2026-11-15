import { useEffect, useRef, useState } from 'react';
import { useVitals } from '../../utils/VitalsContext';
import { greenText, levelOf, spacewalk, type Level } from '../../data/maiaData';
import { speak } from '../../utils/tts';
import { useNow } from '../../utils/hooks';
import { PERSONAL_NORMAL, rangeText } from '../../utils/baselines';
import type { Status } from '../../utils/types';
import './evaVisor.css';

/**
 * Spacewalk, in two screens:
 *  1. "Before you go out": suit check, what to expect, timeline of the EVA, suit image, Start.
 *  2. "Outside": four big readings and a few large controls. Nothing else.
 * Data: EVA day of "tomas (sample)" (synthetic_data.csv, step4b), one sample every 2 min.
 * Limits: measurement_ranges.csv, location = spacewalk.
 */
const S = spacewalk.samples;
const L = spacewalk.limits;
const DUR = spacewalk.duration_min;
const suitImage = import.meta.env.BASE_URL + 'avatars/avatar-astronauta-gray.png';

type Key = 'suit_pressure' | 'suit_co2' | 'heart_rate' | 'eva_time_remaining';
const SIGNALS: { id: Key; label: string; unit: string; digits: number; hint: string }[] = [
  { id: 'suit_pressure', label: 'Suit pressure', unit: 'psi', digits: 2, hint: 'Check the suit display and tell the crew' },
  { id: 'suit_co2', label: 'Suit CO₂', unit: 'mmHg', digits: 1, hint: 'Slow down. Purge as trained at 8 mmHg or with any symptom' },
  { id: 'heart_rate', label: 'Heart rate', unit: 'bpm', digits: 0, hint: 'Slow down, re-check in 2 min' },
  { id: 'eva_time_remaining', label: 'Time left', unit: 'min', digits: 0, hint: 'Head back to the airlock' },
];
const fmt = (sig: (typeof SIGNALS)[number], v: number) => v.toFixed(sig.digits);
const clockOf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const WORD: Record<Level, string> = { green: 'OK', yellow: 'Caution', red: 'Act now', none: '—' };
/** Live ISS sensor status → the same green / yellow / red words. */
const STATUS_LEVEL: Record<Status, Level> = { normal: 'green', advisory: 'green', caution: 'yellow', warning: 'red', critical: 'red' };

/* ---------- summary of the EVA day (computed from the samples) ---------- */
const FIRST = S[0];
const OFF_MIN = S.filter((x) => (['suit_pressure', 'suit_co2', 'heart_rate'] as const).some((k) => levelOf(L, k, x[k]) !== 'green')).length * spacewalk.interval_min;
const PEAK_AT = S.find((x) => x.event)?.minute;
const PEAK_CO2 = Math.max(...S.map((x) => x.suit_co2));
const PEAK_HR = Math.max(...S.map((x) => x.heart_rate));

/* ---------- one strip of the timeline ---------- */
const W = 1000, H = 64, PAD = 6;
function Track({ id, label, unit, minute }: { id: 'suit_co2' | 'heart_rate' | 'suit_pressure'; label: string; unit: string; minute?: number }) {
  const r = L.find((l) => l.measurement_id === id);
  const vals = S.map((x) => x[id]);
  const limits = [r?.ref_green_min, r?.ref_green_max].filter((v): v is number => v != null);
  const lo = Math.min(...vals, ...limits);
  const hi = Math.max(...vals, ...limits);
  const x = (m: number) => (m / DUR) * W;
  const y = (v: number) => H - PAD - ((v - lo) / (hi - lo || 1)) * (H - 2 * PAD);
  const path = S.map((p, i) => `${i ? 'L' : 'M'}${x(p.minute).toFixed(1)},${y(p[id]).toFixed(1)}`).join('');
  const off = S.filter((p) => levelOf(L, id, p[id]) !== 'green');
  return (
    <div className="eva-track">
      <div className="eva-label">{label} <span>· green {greenText(L, id)} {unit}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${label} during the sample spacewalk`}>
        {off.map((p) => <rect key={p.minute} x={x(p.minute)} y={0} width={x(spacewalk.interval_min)} height={H} className="eva-track__off" />)}
        {limits.map((v) => <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} className="eva-track__limit" />)}
        <path d={path} className="eva-track__line" vectorEffect="non-scaling-stroke" />
        {minute != null && <line x1={x(minute)} x2={x(minute)} y1={0} y2={H} className="eva-track__now" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
  );
}

/* ---------- screen 1: before going out ---------- */
function PrepScreen({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const { current, evaluations } = useVitals();
  const now = useNow(1000);
  const evalOf = (k: 'hr' | 'spo2') => evaluations.find((e) => e.key === k);
  // Live rows: from the ISS sensor (same values as Body & Sensors → Live).
  const live = [
    { id: 'hr', label: 'Heart rate', value: String(Math.round(current.hr)), unit: 'bpm', note: `live · ISS sensor · your normal ${rangeText(PERSONAL_NORMAL.hr)}`, level: STATUS_LEVEL[evalOf('hr')?.status ?? 'normal'] },
    { id: 'spo2', label: 'Oxygen (SpO₂)', value: String(Math.round(current.spo2)), unit: '%', note: `live · ISS sensor · your normal ${rangeText(PERSONAL_NORMAL.spo2)}`, level: STATUS_LEVEL[evalOf('spo2')?.status ?? 'normal'] },
  ];
  // Suit rows: no pre-spacewalk suit data exists, so they show the first suit reading of the sample spacewalk.
  const suit = SIGNALS.filter((s) => s.id !== 'heart_rate').map((s) => ({
    id: s.id, label: s.label, value: fmt(s, FIRST[s.id]), unit: s.unit,
    note: `suit · green ${greenText(L, s.id)} ${s.unit}`, level: levelOf(L, s.id, FIRST[s.id]),
  }));
  const rows = [...live, ...suit];
  const ready = rows.every((c) => c.level === 'green');
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => start.current?.focus(), []);
  return (
    <main className="eva eva--prep" aria-label="Spacewalk preparation">
      <header className="eva__header">
        <div>
          <p className="eva-label">Spacewalk · before you go out · sample data ({spacewalk.person})</p>
          <h1 className="eva__title">Suit check</h1>
        </div>
        <span className="eva-prep__clock" aria-label="Mission time">{new Date(now).toISOString().slice(11, 19)} <small>GMT</small></span>
        <button type="button" className="eva-btn" onClick={onClose}>Back to the ISS</button>
      </header>

      <div className="eva-prep">
        <figure className="eva-prep__suit">
          <div className="eva-prep__portrait">
            <img src={suitImage} alt="Spacesuit" width={1024} height={1536} />
            <span className="eva-prep__image-credit"><span aria-hidden="true">✦ </span>AI-generated content</span>
          </div>
          <figcaption className={`eva-state eva-state--${ready ? 'green' : 'yellow'}`}>{ready ? 'Ready to go out' : 'Check before going out'}</figcaption>
        </figure>

        <section className="eva-panel">
          <h2 className="eva-label">You and your suit now</h2>
          <ul className="eva-check">
            {rows.map((c) => (
              <li key={c.id} className={c.note.startsWith('live') ? 'is-live' : undefined}>
                <span className="eva-check__name">{c.label}<small>{c.note.startsWith('live') && <i className="eva-live-dot" aria-hidden="true" />}{c.note}</small></span>
                <strong>{c.value} <small>{c.unit}</small></strong>
                <span className={`eva-state eva-state--${c.level}`}>{WORD[c.level]}</span>
              </li>
            ))}
          </ul>
          <p className="eva-note">Suit values = first reading of the sample spacewalk; there is no suit data from before going out.</p>
        </section>

        <section className="eva-panel">
          <h2 className="eva-label">What to expect</h2>
          <ul className="eva-expect">
            <li><strong>{Math.floor(DUR / 60)} h {String(DUR % 60).padStart(2, '0')}</strong> outside, plus a 30-min reserve.</li>
            {PEAK_AT != null && <li>Hardest part around <strong>hour {Math.floor(PEAK_AT / 60)}</strong>: suit CO₂ up to {PEAK_CO2.toFixed(1)} mmHg, heart rate up to {PEAK_HR} bpm.</li>}
            <li>{OFF_MIN} of {DUR} min in yellow, none in red. Maia tells you when to slow down.</li>
          </ul>
          <button ref={start} type="button" className="eva-btn eva-btn--start" onClick={onStart}>Start spacewalk</button>
        </section>

        <section className="eva-panel eva-prep__timeline">
          <h2 className="eva-label">The sample spacewalk, hour by hour</h2>
          <Track id="suit_co2" label="Suit CO₂" unit="mmHg" />
          <Track id="heart_rate" label="Heart rate" unit="bpm" />
          <Track id="suit_pressure" label="Suit pressure" unit="psi" />
          <div className="eva-track__axis" aria-hidden="true">
            {Array.from({ length: Math.floor(DUR / 60) + 1 }, (_, h) => <span key={h}>{h} h</span>)}
          </div>
          <p className="eva-note">Yellow bands = minutes outside green. Source: synthetic_data.csv (is_synthetic = yes) · limits: measurement_ranges.csv</p>
        </section>
      </div>
    </main>
  );
}

/* ---------- screen 2: outside (simple, big, high contrast) ---------- */
function LiveScreen({ onEnd }: { onEnd: () => void }) {
  const { voiceOn, setVoiceOn } = useVitals();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [log, setLog] = useState('Spacewalk started');
  const [writingNote, setWritingNote] = useState(false);
  const end = useRef<HTMLButtonElement>(null);
  const sample = S[index];

  useEffect(() => end.current?.focus(), []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1 < S.length ? i + 1 : i)), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const readings = SIGNALS.map((s) => ({ ...s, raw: sample[s.id], level: levelOf(L, s.id, sample[s.id]) }));
  const worst: Level = readings.some((r) => r.level === 'red') ? 'red' : readings.some((r) => r.level === 'yellow') ? 'yellow' : 'green';

  // Say a yellow or red value once, when it starts.
  const lastSaid = useRef('');
  useEffect(() => {
    const off = readings.filter((r) => r.level === 'yellow' || r.level === 'red');
    const key = off.map((r) => r.id).join('|');
    if (key === lastSaid.current) return;
    lastSaid.current = key;
    if (!off.length) return;
    const text = off.map((r) => `${r.label} ${fmt(r, r.raw)} ${r.unit}. ${r.hint}.`).join(' ');
    setLog(`${clockOf(sample.minute)} · ${text}`);
    if (voiceOn) speak(text, { interrupt: true });
  });

  function readAloud() {
    const text = readings.map((r) => `${r.label} ${fmt(r, r.raw)} ${r.unit}`).join('. ');
    const played = voiceOn && speak(text, { interrupt: true });
    setLog(played ? 'Reading values aloud' : 'Voice is off');
  }

  return (
    <main className="eva eva--live" aria-label="Spacewalk visor">
      <header className="eva__header">
        <div className="eva-live__time">
          <span className="eva-label">Spacewalk</span>
          <strong aria-label="Elapsed time">{clockOf(sample.minute)}</strong>
        </div>
        <span className={`eva-state eva-state--big eva-state--${worst}`} role="status">
          {worst === 'green' ? 'All in range' : worst === 'yellow' ? 'Slow down' : 'Act now'}
        </span>
        <button ref={end} type="button" className="eva-btn" onClick={onEnd}>End spacewalk</button>
      </header>

      <section className="eva-live__readings" aria-label="Readings">
        {readings.map((r) => (
          <article key={r.id} className={`eva-reading eva-reading--${r.level}`}>
            <span className="eva-reading__label">{r.label}</span>
            <strong className="eva-reading__value">{fmt(r, r.raw)}<small>{r.unit}</small></strong>
            <span className="eva-reading__hint">
              {r.level === 'yellow' || r.level === 'red' ? r.hint : `Green ${greenText(L, r.id)}`}
            </span>
          </article>
        ))}
      </section>

      <p className="eva-live__log" role="log" aria-live="polite">{log}</p>

      <footer className="eva-live__controls">
        <button type="button" className="eva-btn eva-btn--primary" onClick={readAloud}>Read aloud</button>
        <button type="button" className="eva-btn" onClick={() => setWritingNote(!writingNote)}>Log a note</button>
        <button type="button" className="eva-btn" aria-pressed={voiceOn} onClick={() => setVoiceOn(!voiceOn)}>Voice {voiceOn ? 'on' : 'off'}</button>
        {writingNote && (
          <form className="eva-live__note" onSubmit={(e) => {
            e.preventDefault();
            const note = String(new FormData(e.currentTarget).get('evaNote') ?? '').trim();
            if (note) { setLog(`${clockOf(sample.minute)} · Note: ${note}`); setWritingNote(false); }
          }}>
            <input name="evaNote" aria-label="Note" maxLength={180} required autoFocus />
            <button type="submit" className="eva-btn">Save</button>
          </form>
        )}
      </footer>

      <details className="eva-demo">
        <summary>Demo replay</summary>
        <div className="eva-demo__row">
          <button type="button" className="eva-btn eva-btn--sm" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
          <input type="range" min={0} max={S.length - 1} value={index} aria-label="Spacewalk minute" onChange={(e) => setIndex(Number(e.target.value))} />
          <button type="button" className="eva-btn eva-btn--sm" onClick={() => setIndex(S.findIndex((x) => x.minute >= 240))}>Go to hour 4</button>
        </div>
        <p className="eva-note">Sample spacewalk ({spacewalk.person}) · 1 s = {spacewalk.interval_min} min · synthetic_data.csv</p>
      </details>
    </main>
  );
}

export default function EvaVisor() {
  const { setEvaMode } = useVitals();
  const [phase, setPhase] = useState<'prep' | 'live'>('prep');
  return (
    <div onKeyDown={(e) => { if (e.key === 'Escape') setEvaMode(false); }}>
      {phase === 'prep'
        ? <PrepScreen onStart={() => setPhase('live')} onClose={() => setEvaMode(false)} />
        : <LiveScreen onEnd={() => setPhase('prep')} />}
    </div>
  );
}
