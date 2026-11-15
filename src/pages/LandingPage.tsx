import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mascot } from '../components/external';
import './landing.css';

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

type HazardKey = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'closed';

const HAZARDS: { key: HazardKey; name: string; what: string }[] = [
  { key: 'radiation', name: 'Space radiation', what: 'Galactic cosmic rays and solar particle events pass through the hull and the body.' },
  { key: 'isolation', name: 'Isolation & confinement', what: 'Small crews, little privacy and broken sleep for months at a time.' },
  { key: 'distance', name: 'Distance from Earth', what: 'Help is hours, days or months away, and messages arrive late.' },
  { key: 'gravity', name: 'Altered gravity', what: 'Fluids shift to the head; bones and muscles stop carrying load.' },
  { key: 'closed', name: 'Hostile, closed environment', what: 'Recycled air with more CO₂, noise, and microbes that change in flight.' },
];

interface Environment {
  id: string;
  name: string;
  trip: string;
  /** 1–5: relative exposure, for illustration */
  level: Record<HazardKey, number>;
  note: string;
}

const ENVIRONMENTS: Environment[] = [
  {
    id: 'iss',
    name: 'Space station',
    trip: 'Low Earth orbit · ~6 months',
    level: { radiation: 2, isolation: 2, distance: 1, gravity: 3, closed: 3 },
    note: "Earth's magnetic field still blocks much of the radiation, and a capsule can return the crew within hours.",
  },
  {
    id: 'moon',
    name: 'Lunar surface',
    trip: 'Moon · days to weeks',
    level: { radiation: 4, isolation: 3, distance: 2, gravity: 3, closed: 3 },
    note: 'Outside the magnetic field. Lunar dust, 1/6 gravity and about three days back to Earth.',
  },
  {
    id: 'transit',
    name: 'Deep-space transit',
    trip: 'Earth → Mars · 6–9 months each way',
    level: { radiation: 5, isolation: 5, distance: 5, gravity: 5, closed: 5 },
    note: 'No shield, no resupply and no way home early. Every hazard is at its highest, for the longest time.',
  },
  {
    id: 'mars',
    name: 'Mars surface',
    trip: 'Mars · over a year',
    level: { radiation: 4, isolation: 5, distance: 5, gravity: 4, closed: 4 },
    note: 'Thin atmosphere, 3/8 gravity after months of weightlessness, and messages that take up to ~22 minutes each way.',
  },
];

interface Risk {
  id: string;
  name: string;
  short: string;
  body: string;
  watch: string;
  immune: string;
  hue: string;
}

const RISKS: Risk[] = [
  {
    id: 'immune',
    name: 'Immune dysregulation',
    short: 'Immune',
    body: 'In flight the immune system can turn down and up at the same time: weaker defences against infection, stronger inflammation and allergy-like reactions.',
    watch: 'Frequent colds, slow-healing cuts, new allergies, unusual tiredness.',
    immune: 'This is the thread that ties every other risk together.',
    hue: '#d93636',
  },
  {
    id: 'viral',
    name: 'Viral reactivation',
    short: 'Shingles',
    body: 'Dormant viruses such as varicella-zoster (the cause of shingles) and other herpesviruses can wake up under spaceflight stress.',
    watch: 'A painful, blistering band of rash on one side of the body; cold sores.',
    immune: 'Reactivation is a sign that immune control has slipped.',
    hue: '#e8762b',
  },
  {
    id: 'skin',
    name: 'Skin rashes & allergies',
    short: 'Skin',
    body: 'Rashes and skin irritation are among the most common in-flight complaints, and new allergic reactions can appear far from a dermatologist.',
    watch: 'A rash that spreads, swells, blisters or does not fade. Photograph it for a professional to see.',
    immune: 'Hypersensitivity is the "turned up" side of immune change.',
    hue: '#f0c419',
  },
  {
    id: 'radiation',
    name: 'Radiation damage',
    short: 'Radiation',
    body: 'Radiation damages DNA and tissues. Over a career it raises cancer risk; a large solar event can cause acute sickness.',
    watch: 'Nausea or vomiting after a solar alert; cumulative dose against the career limit.',
    immune: 'Blood-forming cells, including immune cells, are among the most sensitive.',
    hue: '#a46bd6',
  },
  {
    id: 'bone',
    name: 'Bone & muscle loss',
    short: 'Bone',
    body: 'Without load, weight-bearing bones can lose around 1–1.5 % of their density per month, and muscles shrink unless exercise is kept up.',
    watch: 'Back pain, missed exercise blocks, kidney-stone risk from calcium.',
    immune: 'Bone marrow is also where immune cells are made.',
    hue: '#7ab317',
  },
  {
    id: 'heart',
    name: 'Heart & fluid shifts',
    short: 'Heart',
    body: 'Fluids move toward the head, the heart works differently and blood pressure control changes, especially when gravity returns.',
    watch: 'Blood pressure drift, racing heart, dizziness on standing.',
    immune: 'Inflammation also strains blood vessels.',
    hue: '#2f6fdb',
  },
  {
    id: 'eyes',
    name: 'Vision changes (SANS)',
    short: 'Eyes',
    body: 'Spaceflight-associated neuro-ocular syndrome changes the back of the eye in many long-duration astronauts.',
    watch: 'Blurry near vision, headaches, changes on the vision chart.',
    immune: 'Fluid shift and high CO₂ make it worse, along with headaches.',
    hue: '#3a97dd',
  },
  {
    id: 'sleep',
    name: 'Sleep & stress',
    short: 'Sleep',
    body: 'Sunrise every 90 minutes, noise and workload cut sleep short. Isolation and confinement weigh on mood.',
    watch: 'Less than 6 h of sleep, irritability, low mood, trouble focusing.',
    immune: 'Poor sleep and stress hormones directly weaken immunity.',
    hue: '#3d5a73',
  },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Adds `is-in` when the element scrolls into view (once). */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** The red "immune thread" note that runs through the whole page. */
function ImmuneThread({ children }: { children: ReactNode }) {
  return (
    <p className="immune-thread">
      <span className="immune-thread__dot" aria-hidden="true" />
      <span>
        <b>Immune thread · </b>
        {children}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Risk wheel (SVG)                                                    */
/* ------------------------------------------------------------------ */

const WHEEL = 360;
const C = WHEEL / 2;
const R_OUT = 168;
const R_IN = 92;

function sector(i: number, n: number, rOut: number, rIn: number) {
  const gap = 0.012;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap;
  const p = (a: number, r: number) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(a0, rOut)} A${rOut} ${rOut} 0 0 1 ${p(a1, rOut)} L${p(a1, rIn)} A${rIn} ${rIn} 0 0 0 ${p(a0, rIn)} Z`;
}

function RiskWheel({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  const n = RISKS.length;
  // Rotate so the selected sector sits on the left (pointing at the info panel)
  const rotation = 180 - ((selected + 0.5) / n) * 360 + 90;

  return (
    <div className="wheel">
      <svg viewBox={`0 0 ${WHEEL} ${WHEEL}`} className="wheel__svg" role="group" aria-label="Spaceflight health risks">
        <g className="wheel__spin" style={{ transform: `rotate(${rotation}deg)` }}>
          {RISKS.map((r, i) => {
            const mid = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
            const lr = (R_OUT + R_IN) / 2;
            const lx = C + lr * Math.cos(mid);
            const ly = C + lr * Math.sin(mid);
            const textRot = (mid * 180) / Math.PI;
            const flip = Math.cos(mid + (rotation * Math.PI) / 180) < 0;
            return (
              <g
                key={r.id}
                className={`wheel__sector ${i === selected ? 'is-selected' : ''}`}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(i);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={i === selected}
                aria-label={r.name}
                style={{ ['--hue' as string]: r.hue }}
              >
                <path d={sector(i, n, i === selected ? R_OUT + 8 : R_OUT, R_IN)} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${textRot + (flip ? 180 : 0)} ${lx} ${ly})`}
                >
                  {r.short}
                </text>
              </g>
            );
          })}
        </g>
        <circle cx={C} cy={C} r={R_IN - 10} className="wheel__hub" />
        <text x={C} y={C - 6} textAnchor="middle" className="wheel__hub-label">
          {selected + 1} / {n}
        </text>
        <text x={C} y={C + 14} textAnchor="middle" className="wheel__hub-sub">
          tap a risk
        </text>
      </svg>
      <span className="wheel__pointer" aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface LandingPageProps {
  onStart: () => void;
  onDemo?: () => void;
}

export default function LandingPage({ onStart, onDemo }: LandingPageProps) {
  const [envId, setEnvId] = useState('transit');
  const [riskIdx, setRiskIdx] = useState(0);
  const env = ENVIRONMENTS.find((e) => e.id === envId)!;
  const risk = RISKS[riskIdx];
  const hazardsRef = useRef<HTMLElement>(null);

  return (
    <div className="landing">
      {/* ---------- top bar ---------- */}
      <header className="landing__nav">
        <span className="landing__brand">
          <span className="landing__brand-dot" aria-hidden="true" />
          Maia
        </span>
        <span className="landing__tag">NASA Space Apps 2026</span>
        <div className="landing__nav-actions">
          {onDemo && (
            <button type="button" className="landing__link" onClick={onDemo}>
              Skip to demo
            </button>
          )}
          <button type="button" className="landing__btn landing__btn--small" onClick={onStart}>
            Get started
          </button>
        </div>
      </header>

      {/* ---------- 1. hero ---------- */}
      <section className="hero">
        <div className="hero__stars" aria-hidden="true" />
        <div className="hero__orbit" aria-hidden="true" />
        <div className="hero__mascot">
          <Mascot size={300} />
        </div>
        <div className="hero__copy">
          <p className="landing__eyebrow">Health monitoring for space missions</p>
          <h1 className="hero__title">
            Medical Assistance <br />
            for <span className="hero__accent">Astronauts</span>
          </h1>
          <p className="hero__sub">
            <b>For those the furthest away.</b> Maia helps astronauts take their health into their own hands, motivating them to{' '}
            <span className="hero__verb">document</span>, <span className="hero__verb">measure</span> and{' '}
            <span className="hero__verb">visualize</span> the changes in their body.
          </p>
          <div className="hero__actions">
            <button type="button" className="landing__btn" onClick={onStart}>
              Start your health record
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="landing__btn landing__btn--ghost"
              onClick={() => hazardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              Why it matters
            </button>
          </div>
        </div>
        <button
          type="button"
          className="hero__scroll"
          onClick={() => hazardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Scroll to learn more"
        >
          <span />
        </button>
      </section>

      {/* ---------- 2. hazards by environment ---------- */}
      <section className="lsection" ref={hazardsRef}>
        <Reveal>
          <p className="landing__eyebrow">01 · The environment</p>
          <h2 className="lsection__title">Five hazards follow every crew.</h2>
          <p className="lsection__lede">
            NASA's Human Research Program groups the dangers of spaceflight into five hazards. They are always there. What changes is
            how strong they are and <b>how long</b> the crew is exposed to them.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="env-tabs" role="tablist" aria-label="Mission environment">
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={e.id === envId}
                className={`env-tab ${e.id === envId ? 'is-active' : ''}`}
                onClick={() => setEnvId(e.id)}
              >
                <span className="env-tab__name">{e.name}</span>
                <span className="env-tab__trip">{e.trip}</span>
              </button>
            ))}
          </div>

          <div className="hazards">
            {HAZARDS.map((h, i) => (
              <div key={h.key} className="hazard" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="hazard__head">
                  <span className="hazard__name">{h.name}</span>
                  <span className="hazard__level">{['', 'Low', 'Moderate', 'Elevated', 'High', 'Extreme'][env.level[h.key]]}</span>
                </div>
                <div className="hazard__bar">
                  <span
                    className={`hazard__fill hazard__fill--${env.level[h.key]}`}
                    style={{ width: `${env.level[h.key] * 20}%` }}
                  />
                </div>
                <p className="hazard__what">{h.what}</p>
              </div>
            ))}
          </div>
          <p className="env-note-landing">{env.note}</p>
          <p className="lsection__fine">Bars show relative exposure between environments, for illustration.</p>
        </Reveal>

        <Reveal delay={150}>
          <ImmuneThread>
            Radiation, weightlessness, short sleep and stress all push on the same system. Long missions stack them, and the immune
            system is one of the first places it shows.
          </ImmuneThread>
        </Reveal>
      </section>

      {/* ---------- 3. risk wheel ---------- */}
      <section className="lsection lsection--tint">
        <Reveal>
          <p className="landing__eyebrow">02 · The body</p>
          <h2 className="lsection__title">What those hazards do to the body.</h2>
          <p className="lsection__lede">Turn the wheel to explore the health risks crews face, and what an astronaut can watch for themselves.</p>
        </Reveal>

        <Reveal delay={100} className="risks">
          <article className="risk-card" key={risk.id} style={{ ['--hue' as string]: risk.hue }}>
            <span className="risk-card__num">
              {String(riskIdx + 1).padStart(2, '0')} / {String(RISKS.length).padStart(2, '0')}
            </span>
            <h3 className="risk-card__title">{risk.name}</h3>
            <p className="risk-card__body">{risk.body}</p>
            <div className="risk-card__watch">
              <span className="risk-card__label">What to watch</span>
              <p>{risk.watch}</p>
            </div>
            <ImmuneThread>{risk.immune}</ImmuneThread>
            <div className="risk-card__nav">
              <button type="button" onClick={() => setRiskIdx((riskIdx - 1 + RISKS.length) % RISKS.length)} aria-label="Previous risk">
                ←
              </button>
              <button type="button" onClick={() => setRiskIdx((riskIdx + 1) % RISKS.length)} aria-label="Next risk">
                →
              </button>
            </div>
          </article>
          <RiskWheel selected={riskIdx} onSelect={setRiskIdx} />
        </Reveal>
      </section>

      {/* ---------- 4. the problem ---------- */}
      <section className="lsection">
        <Reveal>
          <p className="landing__eyebrow">03 · The problem</p>
          <h2 className="lsection__title">The doctor is very, very far away.</h2>
          <p className="lsection__lede">
            On Earth, a strange rash means a quick visit. In space, the crew has a limited medical kit, usually no physician on board,
            and a ground team that sees them through a delayed, part-time link.
          </p>
        </Reveal>

        <div className="problems">
          {[
            { big: '~37 h', label: 'for a blood sample to reach a lab on Earth', sub: 'and that is from low Earth orbit, not from Mars' },
            { big: '≤ 22 min', label: 'one-way message delay to Mars', sub: 'no live video call with a doctor' },
            { big: '1 kit', label: 'of medical supplies, no hospital', sub: 'what is on board is what there is' },
            { big: '4–6', label: 'people, isolated for months', sub: 'often no physician among them' },
          ].map((p, i) => (
            <Reveal key={p.big} delay={i * 90} className="problem">
              <span className="problem__big">{p.big}</span>
              <span className="problem__label">{p.label}</span>
              <span className="problem__sub">{p.sub}</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <ImmuneThread>
            Immune changes often show first on the skin and in how the body feels: a rash, shingles, a new allergy, constant tiredness.
            By the time a lab result comes back, the moment to act may be gone. A clear photo and a timeline help the flight surgeon see it now.
          </ImmuneThread>
        </Reveal>
      </section>

      {/* ---------- 5. the answer ---------- */}
      <section className="lsection lsection--answer">
        <Reveal>
          <p className="landing__eyebrow">04 · Our answer</p>
          <h2 className="lsection__title">So the crew takes the first look.</h2>
          <p className="lsection__lede">
            Maia does not diagnose. It turns every astronaut into a careful observer of their own body, and gives the medical team
            better information, sooner.
          </p>
        </Reveal>

        <div className="pillars">
          {[
            { n: '01', t: 'Document', d: 'Log symptoms in seconds and photograph rashes with a guided camera that checks light, focus and framing.' },
            { n: '02', t: 'Measure', d: 'Vitals compared with your own normal, not a textbook average, with spoken alerts during spacewalks.' },
            { n: '03', t: 'Visualize', d: 'See your trends beside radiation, CO₂ and sleep, so patterns appear before they become problems.' },
          ].map((p, i) => (
            <Reveal key={p.t} delay={i * 110} className="pillar">
              <span className="pillar__n">{p.n}</span>
              <h3 className="pillar__t">{p.t}</h3>
              <p className="pillar__d">{p.d}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="cta">
          <div className="cta__mascot">
            <Mascot size={120} />
          </div>
          <div>
            <h3 className="cta__title">Ready to set up your health record?</h3>
            <p className="cta__sub">It takes a few minutes and works without a connection.</p>
          </div>
          <button type="button" className="landing__btn" onClick={onStart}>
            Start your health record
            <span aria-hidden="true">→</span>
          </button>
        </Reveal>
      </section>

      <footer className="landing__footer">
        Maia supports decisions; it does not replace your crew medical officer or flight surgeon. · NASA Space Apps Challenge 2026
      </footer>
    </div>
  );
}
