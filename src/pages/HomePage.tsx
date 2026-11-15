import { useMemo, useRef, useState } from 'react';
import type { PageId, RoutineTask, Status, VitalEvaluation } from '../utils/types';
import { STATUS_RANK } from '../utils/baselines';
import { ASTRONAUT, ENVIRONMENT, GOALS, ROUTINE_BLOCKS, ROUTINE_TASKS, TODAY_DAY } from '../utils/mockData';
import { REPORT_DAY, contexts, daily, earth, immune, levelOf, reportSection, upTo } from '../data/maiaData';
import { signed } from '../utils/format';
import { useNow } from '../utils/hooks';
import { useVitals } from '../utils/VitalsContext';
import { Mascot } from '../components/external';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import OrbitNode from '../components/home/OrbitNode';
import HabitBubble from '../components/home/HabitBubble';
import RoutineClock from '../components/home/RoutineClock';
import TaskList from '../components/home/TaskList';
import GoalBars from '../components/home/GoalBars';
import './pages.css';
import OrbitRing from '../components/home/OrbitRing';

const SHORT_LABEL: Record<VitalEvaluation['key'], string> = {
  bp: 'Systolic',
  hr: 'Heart rate',
  spo2: 'SpO₂',
  temp: 'Temperature',
};

interface RankedChange {
  type: 'marked_change' | 'immune_review';
  measurement: string;
  direction: string;
  first_day_outside: number;
  days_outside_of_6?: number;
}
const CHANGE_NAME: Record<string, string> = {
  heart_rate: 'Heart rate',
  bp_systolic: 'Blood pressure',
  bp_diastolic: 'Blood pressure',
  spo2: 'SpO₂',
  temperature: 'Temperature',
  sleep: 'Sleep',
};
/** Changes of the latest report (analysis, day 42). */
const CHANGES = reportSection<{ changes: RankedChange[] }>('Ordered changes')?.changes ?? [];
const PACKET_KB = reportSection<{ size_kb: number }>('Send')?.size_kb ?? 0;
const BODY_CHANGE = CHANGES.find((c) => c.type === 'marked_change');
/** What needs attention, in plain words (from the report). */
const NEEDS_TEXT = CHANGES.map((c) =>
  c.type === 'immune_review' ? 'immune review' : `${(CHANGE_NAME[c.measurement] ?? c.measurement).toLowerCase()} ${c.direction === 'low' ? 'low' : 'high'}`,
).join(' · ');

/** Big Body node: a live reading past the reference limits first, else the top marked change of the report. */
function bodyFocus(evaluations: VitalEvaluation[]) {
  const worst = evaluations.reduce((w, e) => (STATUS_RANK[e.status] > STATUS_RANK[w.status] ? e : w), evaluations[0]);
  if (STATUS_RANK[worst.status] >= STATUS_RANK.caution) {
    return {
      value: signed(worst.deviation, worst.key === 'temp' ? 1 : 0),
      unit: worst.unit,
      status: worst.status,
      caption: `${SHORT_LABEL[worst.key]} vs your normal · live`,
    };
  }
  if (BODY_CHANGE) {
    return {
      value: `${BODY_CHANGE.days_outside_of_6}/6`,
      unit: 'days',
      status: 'caution' as Status,
      caption: `${CHANGE_NAME[BODY_CHANGE.measurement] ?? BODY_CHANGE.measurement} ${BODY_CHANGE.direction === 'low' ? 'below' : 'above'} your normal · since D${BODY_CHANGE.first_day_outside}`,
    };
  }
  return { value: 'OK', unit: '', status: 'normal' as Status, caption: 'All four signals in your normal' };
}

/* ---------- dynamic orbit nodes: each shows the most representative fact right now ---------- */

/** Environment: CO₂ past a limit > recent solar event > today's radiation dose. */
function envFocus() {
  const co2 = daily.cabin_co2.find((c) => c.day === REPORT_DAY);
  const ref = daily.reference.cabin_co2;
  if (co2 && ref?.red_above != null && co2.max_1h > ref.red_above) {
    return { value: co2.max_1h.toFixed(1), unit: 'mmHg', status: 'critical' as Status, label: 'Cabin CO₂ 1-h' };
  }
  if (co2 && ref?.green_max != null && co2.mean_7d != null && co2.mean_7d >= ref.green_max) {
    return { value: co2.mean_7d.toFixed(1), unit: 'mmHg', status: 'caution' as Status, label: 'CO₂ 7-day mean' };
  }
  const solar = upTo(daily.events).find((e) => e.id === 'solar_event' && REPORT_DAY - e.day <= 2);
  if (solar) return { value: `D${solar.day}`, unit: '', status: 'advisory' as Status, label: 'Solar storm' };
  return { value: ENVIRONMENT.todayDose.toFixed(1), unit: 'mSv', status: 'normal' as Status, label: 'Dose today' };
}

/** Reports: an open immune review first, else the number of ranked changes. */
function reportFocus(sent: boolean) {
  const today = immune.timeline.find((d) => d.day === REPORT_DAY);
  const size = `${PACKET_KB.toFixed(1)} KB`;
  if (today?.immune_review) {
    return { value: `${today.n_domains}/4`, unit: 'immune', status: 'caution' as Status, label: sent ? 'Queued' : `Review · ${size}` };
  }
  return {
    value: String(CHANGES.length),
    unit: CHANGES.length === 1 ? 'change' : 'changes',
    status: (CHANGES.length ? 'caution' : 'normal') as Status,
    label: sent ? 'Queued' : `Ready · ${size}`,
  };
}

/* ---------- back on Earth (synthetic "iris (sample)", step4b) ---------- */
const EARTH_TODAY = earth.days[earth.days.length - 1];
const LEVEL_STATUS: Record<string, Status> = { green: 'normal', yellow: 'caution', red: 'critical', none: 'normal' };
const LEVEL_RANK: Record<string, number> = { none: 0, green: 0, yellow: 1, red: 2 };
/** Today's three re-adaptation signals; the Body circle shows the worst (the standing drop on a tie). */
const EARTH_SIGNALS = [
  { id: 'orthostatic_sys_drop', name: 'Standing BP drop', value: EARTH_TODAY.orthostatic_sys_drop, unit: 'mmHg' },
  { id: 'heart_rate', name: 'Resting heart rate', value: EARTH_TODAY.heart_rate, unit: 'bpm' },
  { id: 'sleep', name: 'Sleep', value: EARTH_TODAY.sleep, unit: 'h' },
].map((x) => {
  const level = levelOf(earth.limits, x.id, x.value);
  const low = earth.limits.find((l) => l.measurement_id === x.id)?.ref_green_min;
  return { ...x, level, low: low != null && x.value < low };
});
const EARTH_WORST = EARTH_SIGNALS.reduce((w, x) => (LEVEL_RANK[x.level] > LEVEL_RANK[w.level] ? x : w), EARTH_SIGNALS[0]);
const EARTH_OFF = EARTH_SIGNALS.filter((x) => LEVEL_RANK[x.level] > 0);
const EARTH_BODY = {
  value: String(EARTH_WORST.value),
  unit: EARTH_WORST.unit,
  status: LEVEL_STATUS[EARTH_WORST.level],
  caption: `${EARTH_WORST.name} · R+${EARTH_TODAY.day_after_landing}`,
};
const EARTH_NEEDS_TEXT = EARTH_OFF.map((x) => `${x.name.toLowerCase()} ${x.low ? 'low' : 'high'}`).join(' · ');
const EARTH_CTX = contexts.find((c) => c.id === 'back_on_earth');
const EARTH_ENV = {
  value: '1',
  unit: 'g',
  status: 'normal' as Status,
  label: EARTH_CTX?.daily_dose_msv_max != null ? `${EARTH_CTX.daily_dose_msv_max} mSv/day` : 'Gravity',
};

/** Time until a task, e.g. "in 1 h 20 m". */
function untilText(hhmmText: string, now: number) {
  const [h, m] = hhmmText.split(':').map(Number);
  const d = new Date(now);
  const mins = h * 60 + m - (d.getHours() * 60 + d.getMinutes());
  if (mins <= 0) return 'now';
  return mins < 60 ? `in ${mins} m` : `in ${Math.floor(mins / 60)} h ${mins % 60} m`;
}

const hhmm = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const STATUS_WORD: Record<Status, string> = {
  normal: 'Normal',
  advisory: 'Advisory',
  caution: 'Caution',
  warning: 'Warning',
  critical: 'Critical',
};
function getCrewFirstName(): string {
  try {
    const raw =
      localStorage.getItem('aboutYou') ||
      localStorage.getItem('userProfile') ||
      localStorage.getItem('astronautProfile');
    if (raw) {
      const parsed = JSON.parse(raw);
      const fullName = parsed.fullName || parsed.name || parsed.firstName;
      if (typeof fullName === 'string' && fullName.trim()) {
        return fullName.trim().split(/\s+/)[0];
      }
    }
  } catch {
    // Si falla el parseo, usa el valor por defecto
  }
  return ASTRONAUT.name;
}
export default function HomePage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const crewName = useMemo(() => getCrewFirstName(), []);
  const { evaluations, place } = useVitals();
  const onEarth = place === 'earth';
  const now = useNow(15_000);
  const routineRef = useRef<HTMLElement>(null);
  const [water, setWater] = useState<number>(GOALS.water.value);
  const [lastDrink, setLastDrink] = useState<number | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);


  const issBody = useMemo(() => bodyFocus(evaluations), [evaluations]);
  // Each circle shows what matters most where the crew member is now.
  const body = onEarth ? EARTH_BODY : issBody;
  const env = onEarth ? EARTH_ENV : envFocus();
  const rep = reportFocus(false);
  // routine follows the real clock: tasks before now are done, the first one after now is next
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const nextTask = ROUTINE_TASKS.find((t) => toMin(t.time) > nowMin);
  const tasks = ROUTINE_TASKS.map((t) => ({
    ...t,
    state: (toMin(t.time) <= nowMin ? 'done' : t.id === nextTask?.id ? 'next' : 'scheduled') as RoutineTask['state'],
  }));
  const done = tasks.filter((t) => t.state === 'done').length;
  const liveIssue = evaluations.some((e) => STATUS_RANK[e.status] >= STATUS_RANK.caution) ? 1 : 0;
  const needs = onEarth ? EARTH_OFF.length : CHANGES.length + liveIssue;
  const needsText = onEarth ? EARTH_NEEDS_TEXT : NEEDS_TEXT;

  const scrollToRoutine = () => routineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openTask = (t: RoutineTask) => {
    if (t.target === 'home') scrollToRoutine();
    else onNavigate(t.target);
  };
  const drink = () => {
    setWater((w) => Math.min(GOALS.water.target + 1, Math.round((w + 0.25) * 100) / 100));
    setLastDrink(Date.now());
  };
  const drinkMeta = lastDrink ? 'last drink just now' : 'no drinks logged yet today';
  const waterDone = water >= GOALS.water.target;

  return (
    <div className="page page--home">
      <section className="home-hero">
        <h1 className="home-greeting">Hi, {crewName}</h1>
        <span className="needs-chip" title={needsText}>
          <i className={`needs-chip__dot needs-chip__dot--${needs ? (body.status === 'normal' ? 'caution' : body.status) : 'normal'}`} />
          {needs ? `${needs} ${needs === 1 ? 'thing needs' : 'things need'} you · ${needsText}` : 'All good right now'}
        </span>

        <div className="orbit">
          <svg className="orbit__rings" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <ellipse cx="500" cy="300" rx="470" ry="290" />
            <ellipse cx="500" cy="300" rx="270" ry="190" />
          </svg>

          <OrbitRing>
            <OrbitNode
              position="env"
              label="Environment"
              value={env.value}
              unit={env.unit}
              status={env.status}
              statusLabel={env.label}
              onClick={() => onNavigate('environment')}
            />
            <OrbitNode
              position="reports"
              label="Reports"
              value={rep.value}
              unit={rep.unit}
              status={rep.status}
              statusLabel={rep.label}
              onClick={() => onNavigate('report')}
            />
            <OrbitNode
              position="body"
              size="lg"
              ring={body.status !== 'normal'}
              label="Body & Sensors"
              value={body.value}
              unit={body.unit}
              status={body.status}
              statusLabel={STATUS_WORD[body.status]}
              caption={body.caption}
              onClick={() => onNavigate('body')}
            />
            <OrbitNode
              position="routine"
              label="Routine"
              value={nextTask?.time ?? '—'}
              status={nextTask ? 'advisory' : 'normal'}
              statusLabel={nextTask ? `${nextTask.label.split(/[:·(]/)[0].trim().slice(0, 16)} · ${untilText(nextTask.time, now)}` : 'All done'}
              onClick={scrollToRoutine}
            />
          </OrbitRing>


          <div className="orbit__center">
            <Mascot size={280} state="idle" />
          </div>

          {bubbleOpen && (
            <div className="orbit__bubble">
              <HabitBubble
                title="MAIA · Habits"
                message={waterDone ? 'Water goal reached. Nice work.' : 'Time for a glass of water?'}
                progress={{ value: water, target: GOALS.water.target, unit: 'L', meta: drinkMeta }}
                onDismiss={() => setBubbleOpen(false)}
                action={
                  !waterDone && (
                    <button type="button" className="btn btn--sm" onClick={drink}>
                      <Icon name="droplet" />
                      Log 250 ml
                    </button>
                  )
                }
              />
            </div>
          )}
        </div>

        <button type="button" className="scroll-cue" onClick={scrollToRoutine}>
          Your routine
          <Icon name="chevronDown" />
        </button>
      </section>

      <section className="routine-section" ref={routineRef}>
        <div className="page-head">
          <div>
            <p className="eyebrow">Routine · {onEarth ? `R+${EARTH_TODAY.day_after_landing}` : `Day ${TODAY_DAY}`}</p>
            <h2 className="page-title">Routine</h2>
            <p className="page-sub">Your day on one clock. Tapping a task takes you straight to it.</p>
          </div>
          <span className="count-chip">
            {done} of {tasks.length} complete
          </span>
        </div>

        <div className="routine-grid">
          <Card className="routine-grid__clock" title="24-hour routine" aside={<span>tap a dot to open its task</span>}>
            <RoutineClock blocks={ROUTINE_BLOCKS} tasks={tasks} now={new Date(now)} day={TODAY_DAY} onTaskClick={openTask} />
            <ul className="clock-legend">
              {ROUTINE_BLOCKS.map((blk) => (
                <li key={blk.label}>
                  <i
                    className="clock-legend__swatch"
                    style={{
                      background:
                        blk.kind === 'sleep'
                          ? '#3d5a73'
                          : blk.kind === 'exercise'
                            ? 'var(--normal)'
                            : 'repeating-linear-gradient(90deg, var(--caution) 0 4px, transparent 4px 7px)',
                    }}
                  />
                  {blk.label}{' '}
                  <span className="mono">
                    {hhmm(blk.start)} – {hhmm(blk.end)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <TaskList tasks={tasks} onOpen={openTask} />

          <div className="routine-grid__bottom">
            <GoalBars
              goals={[
                { key: 'water', label: 'Water', icon: 'droplet', value: water, target: GOALS.water.target, unit: 'L', color: 'var(--advisory)' },
                { key: 'exercise', label: 'Exercise', icon: 'activity', value: GOALS.exercise.value, target: GOALS.exercise.target, unit: 'h', color: 'var(--normal)' },
              ]}
            />
            <section className="card maia-card">
              <Mascot size={64} />
              <div>
                <p className="habit-bubble__title">MAIA · Habits</p>
                <p className="maia-card__text">
                  Sleep averaged {GOALS.sleepAvg} h over the last 7 nights (goal ≥ {GOALS.sleepTarget} h). Water logged today: {water.toFixed(2)} of{' '}
                  {GOALS.water.target} L.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}