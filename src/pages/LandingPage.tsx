import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mascot } from '../components/external';
import './landing.css';

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

type HazardKey = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'closed';

const HAZARDS: { key: HazardKey; name: string; what: string }[] = [
  {
    key: 'radiation',
    name: 'Space Radiation',
    what: 'Invisible to the human eye, space radiation is not only stealthy but considered one of the most hazardous aspects of spaceflight.',
  },
  {
    key: 'isolation',
    name: 'Isolation and Confinement',
    what: 'Behavioral responses occur among groups of people far from Earth who are isolated and confined in a small space over a long period of time.',
  },
  {
    key: 'distance',
    name: 'Distance from Earth',
    what: 'Instructions, new supplies, medical care, and more become increasingly challenging to receive from Earth as astronauts venture deeper into space.',
  },
  {
    key: 'gravity',
    name: 'Gravity Fields',
    what: "Astronauts' entire bodies – muscles, bones, inner ear, and organs – must adjust to the new gravities encountered on the space station or their spacecraft, as well as on the Moon, Mars, and Earth once they return home.",
  },
  {
    key: 'closed',
    name: 'Hostile/Closed Environments',
    what: 'Maintaining a safe ecosystem inside a spacecraft presents unique challenges, from ensuring optimal temperatures, pressures, and lighting, to reducing noise, monitoring microbial communities, and tracking immune responses.',
  },
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
    name: 'Risk of Altered Immune System Responses',
    short: 'Immune',
    body: 'In flight the immune system can turn down and up at the same time: weaker defences against infection, and stronger inflammation and allergy-like reactions. Dormant viruses such as the one behind shingles can wake up.',
    watch: 'Skin rashes, new allergies, shingles or cold sores, slow-healing cuts, unusual tiredness. Photograph skin changes for your flight surgeon.',
    immune: 'This is the thread that ties every other risk together.',
    hue: '#d93636',
  },
  {
    id: 'sensorimotor',
    name: 'Risk of Altered Sensorimotor and Vestibular Function',
    short: 'Balance',
    body: 'Without gravity, the inner ear and the brain lose their sense of "down". Crews can feel space motion sickness at first, and balance, coordination and hand–eye control change, especially when gravity returns.',
    watch: 'Nausea, dizziness, clumsiness, trouble judging distances; extra care during landing and the first days back.',
    immune: 'Space motion sickness and poor sleep add stress that further weakens immunity.',
    hue: '#a46bd6',
  },
  {
    id: 'cardio',
    name: 'Risk of Cardiovascular Adaptations',
    short: 'Heart',
    body: 'Fluids shift toward the head, the heart works differently and blood pressure control adapts to weightlessness. Radiation may also add to long-term damage of blood vessels.',
    watch: 'Blood pressure drifting from your normal, a racing or irregular heartbeat, dizziness when standing.',
    immune: 'Inflammation from immune changes also strains the blood vessels.',
    hue: '#2f6fdb',
  },
  {
    id: 'dcs',
    name: 'Risk of Decompression Sickness',
    short: 'DCS',
    body: 'Spacesuits run at lower pressure than the cabin. If dissolved nitrogen leaves the blood too fast, bubbles can form in joints and tissues. Pre-breathing pure oxygen before a spacewalk lowers the risk.',
    watch: 'Deep joint pain, tingling or numbness, skin itching or mottling, vision changes or confusion after a spacewalk.',
    immune: 'Gas bubbles can trigger an inflammatory response in the tissues they touch.',
    hue: '#3a97dd',
  },
  {
    id: 'hypoxia',
    name: 'Risk of Hypoxia',
    short: 'Hypoxia',
    body: 'Too little oxygen reaching the body, from a suit or cabin problem, a leak, or the lower-pressure atmospheres planned for future habitats. The early signs are easy to miss.',
    watch: 'SpO₂ below your normal, headache, fast breathing, confusion, unusual tiredness.',
    immune: 'Low oxygen is itself a stress signal that changes how immune cells behave.',
    hue: '#e8762b',
  },
  {
    id: 'microbes',
    name: 'Risk of Host-Microorganism Interactions',
    short: 'Microbes',
    body: 'In a closed spacecraft, crews share air, water and surfaces. Some microbes grow and behave differently in spaceflight, and the body\'s own microbiome changes too.',
    watch: 'Skin, eye or urinary infections, stomach upset, a wound that becomes red or swollen.',
    immune: 'A weaker immune system meets microbes that may be more aggressive. This is where the two meet.',
    hue: '#f0c419',
  },
  {
    id: 'fitness',
    name: 'Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness',
    short: 'Fitness',
    body: 'Without load, muscles shrink, weight-bearing bones can lose around 1–1.5 % of their density per month, and aerobic capacity drops, unless daily exercise is kept up.',
    watch: 'Missed exercise blocks, back pain, getting tired sooner, lower scores on fitness checks.',
    immune: 'Bone marrow is where immune cells are made, and regular exercise helps keep immunity balanced.',
    hue: '#7ab317',
  },
  {
    id: 'eva',
    name: 'Risk of Injury and Compromised Performance from Spacewalks',
    short: 'EVA',
    body: 'Hours of hard work in a pressurised suit can injure hands, shoulders and skin, cause overheating or exhaustion, and lower performance when it matters most.',
    watch: 'Fingernail and hand injuries, shoulder pain, pressure spots on the skin, heart rate and temperature during the spacewalk.',
    immune: 'Small suit injuries heal more slowly and are easier to infect when immunity is down.',
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

/** Mounts the 3D mascot only while it is on or near the screen. */
function LazyMascot({ size }: { size: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '200px 0px', // start a little before it scrolls in
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: size, height: size }}>
      {visible && <Mascot size={size} />}
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
          <LazyMascot size={300} />
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

      </section>

      {/* ---------- 2. hazards by environment ---------- */}
      <section className="lsection lsection--first" ref={hazardsRef}>
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
          <p className="lsection__fine">
            Hazard descriptions:{' '}
            <a className="nasa-link"
            href="https://www.nasa.gov/hrp/hazards/"
             target="_blank"
             rel="noopener noreferrer"
             >
              Data from NASA ↗
              </a>{' '}
               · Bars show relative exposure between environments, for illustration.
               </p>
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
          <p className="lsection__fine">
            Risks of Human Spaceflight:{' '}
            <a className="nasa-link"
            href="https://www.nasa.gov/hrp/risks/"
             target="_blank"
             rel="noopener noreferrer"
             >
              Data from NASA ↗
              </a>{' '}
               · Bars show relative exposure between environments, for illustration.
          </p>
        </Reveal>
      </section>

      {/* ---------- 4. the problem ---------- */}
      <section className="lsection">
        <div className="problem-intro">
          <Reveal>
            <p className="landing__eyebrow">03 · The problem</p>
            <h2 className="lsection__title">The doctor is very, very far away.</h2>
            <p className="lsection__lede">
              On Earth, a strange rash means a quick visit. In space, the crew has a limited medical kit, usually no physician on board,
              and a ground team that sees them through a delayed, part-time link.
            </p>
          </Reveal>

          <Reveal delay={150} className="problem-intro__aside">
            <p className="immune-aside">
              Risk is inherent in space missions, but it should be managed and prevented as much as possible. According to NASA's Human
              Research Program, astronauts' body systems, including their immune system, are at risk from the hazards found in space,
              which may result in bodily reactions and symptoms.
            </p>
            <blockquote className="immune-quote">
              "Given that medical conditions will occur during human spaceflight missions, there is a possibility of adverse health
              outcomes &amp; decrements in performance during these missions and for long term health."
              <cite>NASA Human Research Roadmap</cite>
            </blockquote>
            <p className="immune-aside">
              This means astronauts' health should be tracked closely, and followed with treatment when needed.
            </p>
          </Reveal>
        </div>

        <div className="problems">
          {[
            { big: '~37 h', label: 'for a blood sample to reach a lab on Earth', sub: 'and that is from low Earth orbit, not from Mars' },
            { big: '≤ 22 min', label: 'one-way message delay to Mars', sub: 'no live video call with a doctor' },
            { big: '1 kit', label: 'of medical supplies, no hospital', sub: 'what is on board is what there is' },
            { big: '4–6', label: 'people, isolated for months', sub: 'often no physician among them' },
          ].map((p, i) => (
            <Reveal key={p.big} delay={i * 110} className="problem">
              <span className="problem__big">{p.big}</span>
              <span className="problem__label">{p.label}</span>
              <span className="problem__sub">{p.sub}</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <p className="lsection__fine sources">
            Sources, all NASA:{' '}
            <a className="nasa-link" href="https://www.nasa.gov/directorates/esdmd/hhp/immune-risk/" target="_blank" rel="noopener noreferrer">Immune Risk ↗</a>
            <a className="nasa-link" href="https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/" target="_blank" rel="noopener noreferrer">Altered Immune System Responses ↗</a>
            <a className="nasa-link" href="https://www.nasa.gov/hhp/human-system-risks/" target="_blank" rel="noopener noreferrer">Human System Risks ↗</a>
            <a className="nasa-link" href="https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=95" target="_blank" rel="noopener noreferrer">Risk of Adverse Health Outcomes ↗</a>
          </p>
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
          <LazyMascot size={120} />
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
