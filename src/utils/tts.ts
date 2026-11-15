import type { Status } from './types';

let audioCtx: AudioContext | null = null;

/** Short master-alarm style tone played before the spoken alert. */
export function chime(level: Status) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const beeps = level === 'critical' ? 3 : 2;
    const freq = level === 'critical' ? 880 : 660;
    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.18;
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }
  } catch {
    /* audio not available */
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'en-US' && /Google|Samantha|Aria|Jenny/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en'))
  );
}

export function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, opts: { interrupt?: boolean } = {}) {
  if (!speechAvailable()) return false;
  const synth = window.speechSynthesis;
  if (opts.interrupt) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  u.pitch = 1;
  const voice = pickVoice();
  if (voice) u.voice = voice;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
