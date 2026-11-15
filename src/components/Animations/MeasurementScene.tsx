import type { ReactNode } from 'react';

type Cue = 'sleep' | 'timer' | 'medical' | 'heart' | 'lungs' | 'glucose' | 'screen' | 'shield' | 'water' | 'scan' | 'eye' | 'bike' | 'exercise' | 'gauge' | 'air' | 'airlock' | 'thermometer' | 'stand' | 'note';

const symbols: Record<Cue, ReactNode> = {
  sleep: <path d="M46 7a25 25 0 1 0 11 42A24 24 0 0 1 46 7ZM55 8v12m-6-6h12" />,
  timer: <><circle cx="32" cy="36" r="22" /><path d="M32 36V22m-7-16h14m-7 0v8m17 4 5-5" /></>,
  medical: <><rect x="5" y="15" width="54" height="41" rx="8" /><path d="M22 15V8h20v7M32 24v23M21 35h22" /></>,
  heart: <><path d="M32 55 10 34C-8 15 17 2 32 19 47 2 72 15 54 34Z" /><path d="M6 32h13l5-7 7 14 6-10 4 3h17" /></>,
  lungs: <path d="M32 7v20m0-4L19 38m13-15 13 15M25 16C18 8 6 25 5 43c-1 10 7 13 16 10l5-3V29m13-13c7-8 19 9 20 27 1 10-7 13-16 10l-5-3V29" />,
  glucose: <><rect x="10" y="6" width="32" height="50" rx="6" /><path d="M16 14h20v18H16zM23 45h6m17-5c0-4 6-10 6-10s7 6 7 10a7 7 0 0 1-13 0Z" /></>,
  screen: <><rect x="5" y="8" width="54" height="40" rx="5" /><circle cx="32" cy="28" r="8" /><path d="M23 56h18m-9-8v8" /></>,
  shield: <path d="M32 5 56 13v17c0 15-12 25-24 30C20 55 8 45 8 30V13Zm-10 26 7 7 14-16" />,
  water: <path d="M16 20h32l-4 38H20Zm3 17c8-5 17 5 26 0M32 4s-5 6-5 9a5 5 0 0 0 10 0c0-3-5-9-5-9Z" />,
  scan: <path d="M5 51h53M17 51V19a15 15 0 0 1 30 0v32M22 31h20M8 39h48M26 56v4m13-4v4" />,
  eye: <><path d="M4 32s11-17 28-17 28 17 28 17-11 17-28 17S4 32 4 32Z" /><circle cx="32" cy="32" r="9" /></>,
  bike: <><circle cx="14" cy="45" r="10" /><circle cx="50" cy="45" r="10" /><path d="m14 45 12-20 8 20H14m20 0 11-25h10M21 25h12" /></>,
  exercise: <path d="M6 24h8v16H6zm8-5h8v26h-8zm8 13h20m0-13h8v26h-8zm8 5h8v16h-8z" />,
  gauge: <path d="M8 49a24 24 0 1 1 48 0Zm24-7 12-14M15 42h3m14-20v3m15 17h3" />,
  air: <path d="M5 23h35c10 0 10-13 1-13M5 34h45c10 0 10 13 1 13M12 45h19c10 0 10 12 1 12" />,
  airlock: <path d="M13 58V9h38v49M5 58h54M23 58V19h18v39m-5-18h1" />,
  thermometer: <path d="M26 38V12a6 6 0 1 1 12 0v26a12 12 0 1 1-12 0Zm6-14v24m14-32h7m-7 8h7" />,
  stand: <><circle cx="31" cy="11" r="6" /><path d="M31 17v20m0 0L20 57m11-20 10 20M13 32l18-10 18 10M9 60h46" /></>,
  note: <path d="M14 5h35v54H14Zm9 15h17M23 31h17M23 42h12" />,
};

export default function MeasurementScene({ avatar, title, caption, marker, cue, suit = false, unavailable = false, suitReading }: {
  avatar: 'W' | 'M';
  title: string;
  caption: string;
  marker: string;
  cue: Cue;
  suit?: boolean;
  suitReading?: string;
  unavailable?: boolean;
}) {
  const character = avatar === 'W' ? 'avatar-mujer' : 'avatar-hombre';
  const portrait = suit ? 'avatar-astronauta' : character;
  const color = marker === 'R' ? '#ff8589' : marker === 'A' || marker === 'AYR' ? '#ffd17a' : '#78e2e1';
  const label = marker === 'AYR' ? 'YELLOW / RED' : marker === 'A' ? 'YELLOW' : marker === 'R' ? 'RED' : `STEP ${marker}`;

  return (
    <figure style={{ margin: 0, overflow: 'hidden', borderRadius: 16, background: '#142538', color: '#f3f8fa', fontFamily: 'inherit' }}>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '6% 7%', minHeight: 180, background: 'radial-gradient(ellipse at 30% 45%, #3b6478, #1c344b 50%, #102031 90%)' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: '8% 5%', border: '1px solid #79a5b240', borderRadius: 24 }} />
        <img src={`${import.meta.env.BASE_URL}avatars/${portrait}.png`} alt={suit ? 'Maia astronaut' : avatar === 'W' ? 'Maia female avatar' : 'Maia male avatar'}
          style={{ position: 'relative', display: 'block', width: '100%', height: 'clamp(150px, 34vw, 310px)', objectFit: 'contain' }} />
        {suit && <img src={`${import.meta.env.BASE_URL}avatars/${character}.png`}
          alt={avatar === 'W' ? 'Female crew avatar' : 'Male crew avatar'}
          style={{ position: 'absolute', left: '7%', bottom: '8%', width: '13%', aspectRatio: '1', objectFit: 'cover', objectPosition: 'center top', borderRadius: '50%', background: '#28465b', border: '1px solid #78e2e1' }} />}
        <div style={{ position: 'relative', display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 10 }}>
          {suitReading ? (
            <div style={{ width: '100%', boxSizing: 'border-box', maxWidth: 220, border: '3px solid #547889', borderRadius: 12, background: '#081b28', padding: '12px 6px', boxShadow: '0 6px 16px #07131a80' }}>
              <span style={{ display: 'block', color, fontSize: 10, letterSpacing: '.1em' }}>SUIT DISPLAY</span>
              <strong style={{ display: 'block', marginBlock: 5, fontFamily: 'monospace', fontSize: 'clamp(15px, 4vw, 28px)', color }}>{suitReading}</strong>
              <span style={{ fontSize: 10, color: '#bdcbd2' }}>Simulated reading</span>
            </div>
          ) : <svg viewBox="0 0 64 64" aria-hidden="true" width="72" height="72" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            {symbols[cue]}
          </svg>}
          <span style={{ letterSpacing: '.12em', color, fontSize: 10, fontWeight: 700 }}>{unavailable ? 'UNAVAILABLE ONBOARD' : label}</span>
          <strong style={{ fontSize: 'clamp(14px, 3vw, 24px)', lineHeight: 1.2 }}>{title}</strong>
        </div>
      </div>
      <figcaption style={{ padding: '12px 16px', borderTop: `2px solid ${color}`, fontSize: 14, lineHeight: 1.5 }}>
        {caption}
      </figcaption>
    </figure>
  );
}
