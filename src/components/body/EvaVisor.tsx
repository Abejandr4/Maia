import { useEffect, useRef, useState } from 'react';
import { useVitals } from '../../utils/VitalsContext';
import { PERSONAL_NORMAL, rangeText, roundSample } from '../../utils/baselines';
import { speak } from '../../utils/tts';
import './evaVisor.css';

export default function EvaVisor() {
  const { current, setEvaMode, voiceOn, setVoiceOn } = useVitals();
  const [started] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);
  const [log, setLog] = useState('Visor mode on · simulated vitals linked');
  const [writingNote, setWritingNote] = useState(false);
  const exit = useRef<HTMLButtonElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const sample = roundSample(current);

  useEffect(() => {
    const previous = document.activeElement;
    exit.current?.focus();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      window.clearInterval(timer);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [started]);

  const clock = [Math.floor(elapsed / 3600), Math.floor(elapsed / 60) % 60, elapsed % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
  const readings = [
    ['SpO₂', sample.spo2, '%', 'Simulated oxygen saturation'],
    ['Heart rate', sample.hr, 'bpm', `Personal normal ${rangeText(PERSONAL_NORMAL.hr)}`],
    ['Temperature', sample.temp.toFixed(1), '°C', `Core · personal normal ${rangeText(PERSONAL_NORMAL.temp, 1)}`],
  ];

  function readVitals() {
    if (!voiceOn) return;
    const played = speak(`Oxygen saturation ${sample.spo2} percent. Heart rate ${sample.hr} beats per minute. Core temperature ${sample.temp.toFixed(1)} degrees Celsius.`, { interrupt: true });
    setLog(played ? 'Reading vitals aloud' : 'Speech is unavailable on this device');
  }

  return (
    <main className="eva-visor" aria-label="EVA suit visor" onKeyDown={(event) => {
      if (event.key === 'Escape') setEvaMode(false);
    }}>
      <header className="eva-visor__header">
        <div><div className="eva-visor__label">EVA · Suit HUD</div><strong>Maia · Outside Quest</strong></div>
        <div className="eva-visor__actions">
          <span aria-label="Elapsed EVA time">{clock}</span>
          <button ref={exit} type="button" onClick={() => setEvaMode(false)}>× Exit visor</button>
        </div>
      </header>
      <section className="eva-visor__readings" aria-label="Simulated live readings">
        {readings.map(([label, value, unit, detail]) => (
          <article key={label}>
            <div className="eva-visor__label">{label}</div>
            <strong>{value}</strong> <span>{unit}</span>
            <div className="eva-visor__detail">{detail}</div>
          </article>
        ))}
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
