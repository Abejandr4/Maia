import { useEffect, useRef, useState } from 'react';
import { useVitals } from '../../utils/VitalsContext';
import { greenText, levelOf, spacewalk } from '../../data/maiaData';
import { speak } from '../../utils/tts';
import './evaVisor.css';

export default function EvaVisor() {
  const { setEvaMode, voiceOn, setVoiceOn } = useVitals();
  // Replay of the EVA day of "tomas (sample)": one 2-min sample per second of screen time.
  const samples = spacewalk.samples;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [log, setLog] = useState('Visor mode on · simulated vitals linked');
  const [writingNote, setWritingNote] = useState(false);
  const exit = useRef<HTMLButtonElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const sample = samples[index];

  useEffect(() => {
    const previous = document.activeElement;
    exit.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1 < samples.length ? i + 1 : i)), 1000);
    return () => window.clearInterval(timer);
  }, [playing, samples.length]);

  const clock = `${String(Math.floor(sample.minute / 60)).padStart(2, '0')}:${String(sample.minute % 60).padStart(2, '0')}`;
  const L = spacewalk.limits;
  const readings: { id: string; label: string; value: string; unit: string; raw: number; hint: string }[] = [
    { id: 'suit_pressure', label: 'Suit pressure', value: sample.suit_pressure.toFixed(2), unit: 'psi', raw: sample.suit_pressure, hint: 'Check the suit display and tell the crew' },
    { id: 'suit_co2', label: 'Suit CO₂', value: sample.suit_co2.toFixed(1), unit: 'mmHg', raw: sample.suit_co2, hint: 'Slow down; purge as trained at 8 mmHg or with any symptom' },
    { id: 'heart_rate', label: 'Heart rate', value: String(sample.heart_rate), unit: 'bpm', raw: sample.heart_rate, hint: 'Slow down, re-check in 2 min' },
    { id: 'eva_time_remaining', label: 'Time remaining', value: String(sample.eva_time_remaining), unit: 'min', raw: sample.eva_time_remaining, hint: 'Head back to the airlock' },
  ];
  const levels = readings.map((r) => levelOf(L, r.id, r.raw));
  const worst = levels.includes('red') ? 'red' : levels.includes('yellow') ? 'yellow' : 'green';

  // A yellow or red value: say it once when it starts.
  const lastSaid = useRef('');
  useEffect(() => {
    const off = readings.filter((_, i) => levels[i] === 'yellow' || levels[i] === 'red');
    const key = off.map((r) => r.id).join('|');
    if (key === lastSaid.current) return;
    lastSaid.current = key;
    if (!off.length) return;
    const text = off.map((r) => `${r.label} ${r.value} ${r.unit}. ${r.hint}.`).join(' ');
    setLog(`${clock} · ${text}`);
    if (voiceOn) speak(text, { interrupt: true });
  });

  function readVitals() {
    if (!voiceOn) return;
    const played = speak(`Suit pressure ${sample.suit_pressure.toFixed(2)} psi. Suit CO2 ${sample.suit_co2.toFixed(1)}. Heart rate ${sample.heart_rate}. ${sample.eva_time_remaining} minutes remaining.`, { interrupt: true });
    setLog(played ? 'Reading suit and vitals aloud' : 'Speech is unavailable on this device');
  }

  return (
    <main className="eva-visor" aria-label="EVA suit visor" onKeyDown={(event) => {
      if (event.key === 'Escape') setEvaMode(false);
    }}>
      <header className="eva-visor__header">
        <div><div className="eva-visor__label">EVA · Suit HUD · sample data ({spacewalk.person})</div><strong>Maia · Outside Quest</strong></div>
        <div className="eva-visor__actions">
          <span className={`eva-visor__state eva-visor__state--${worst}`}>{worst === 'green' ? 'All in range' : worst === 'yellow' ? 'Caution' : 'Act now'}</span>
          <span aria-label="Elapsed EVA time">EVA {clock}</span>
          <button ref={exit} type="button" onClick={() => setEvaMode(false)}>× End spacewalk</button>
        </div>
      </header>
      <section className="eva-visor__readings" aria-label="Suit and body readings">
        {readings.map((r, i) => (
          <article key={r.id} className={`eva-visor__reading eva-visor__reading--${levels[i]}`}>
            <div className="eva-visor__label">{r.label}</div>
            <strong>{r.value}</strong> <span>{r.unit}</span>
            <div className="eva-visor__detail">
              {levels[i] === 'yellow' || levels[i] === 'red' ? r.hint : `Range ${greenText(L, r.id)} ${r.unit}`}
            </div>
          </article>
        ))}
      </section>
      <section className="eva-visor__replay" aria-label="EVA replay">
        <button type="button" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={samples.length - 1} value={index} aria-label="EVA minute"
          onChange={(e) => setIndex(Number(e.target.value))} />
        <button type="button" onClick={() => setIndex(samples.findIndex((x) => x.minute >= 240))}>Go to hour 4</button>
        <span className="eva-visor__detail">Replay of a synthetic EVA day · 1 s = {spacewalk.interval_min} min · source synthetic_data.csv</span>
      </section>
      <footer className="eva-visor__footer">
        <div>
          <div className="eva-visor__label">Visor controls</div>
          <div className="eva-visor__actions">
            <button type="button" className="eva-visor__primary" disabled={!voiceOn} onClick={readVitals}>Read vitals aloud</button>
            <button type="button" onClick={() => setWritingNote(!writingNote)}>Log a note</button>
            <button type="button" onClick={() => photo.current?.click()}>Attach photo</button>
            <button type="button" aria-pressed={voiceOn} onClick={() => setVoiceOn(!voiceOn)}>VoiceOver {voiceOn ? 'on' : 'off'}</button>
            <input ref={photo} type="file" accept="image/*" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setLog(`Photo selected for this session · ${file.name}`);
            }} />
          </div>
          {writingNote && <form className="eva-visor__actions" onSubmit={(event) => {
            event.preventDefault();
            const note = String(new FormData(event.currentTarget).get('evaNote') ?? '').trim();
            if (note) {
              setLog(note);
              setWritingNote(false);
            }
          }}>
            <input name="evaNote" aria-label="EVA note" maxLength={180} required />
            <button type="submit">Save note</button>
          </form>}
        </div>
        <div className="eva-visor__log"><div className="eva-visor__label">EVA log · Session</div><p role="status">{log}</p></div>
      </footer>
    </main>
  );
}
