import { useMemo, useRef, useState } from 'react';
import type { PageId, RoutineTask, Status, VitalEvaluation } from '../utils/types';
import { PERSONAL_NORMAL, STATUS_RANK, mid } from '../utils/baselines';
import { ASTRONAUT, ENVIRONMENT, GOALS, MORNING_FLAG, ROUTINE_BLOCKS, ROUTINE_TASKS, TODAY_DAY } from '../utils/mockData';
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
import DomeBackground from '../components/home/DomeBackground';

const SHORT_LABEL: Record<VitalEvaluation['key'], string> = {
  bp: 'Systolic',
  hr: 'Heart rate',
  spo2: 'SpO₂',
  temp: 'Temperature',
};

/** Picks what the big Body node should show: the worst live signal, else this morning's flag. */
function bodyFocus(evaluations: VitalEvaluation[]) {
  const worst = evaluations.reduce((w, e) => (STATUS_RANK[e.status] > STATUS_RANK[w.status] ? e : w), evaluations[0]);
  if (STATUS_RANK[worst.status] > 0) {
    return {
      value: signed(worst.deviation, worst.key === 'temp' ? 1 : 0),
      unit: worst.unit,
      status: worst.status,
      caption: `${SHORT_LABEL[worst.key]} vs your normal · live`,
    };
  }
  if (MORNING_FLAG) {
    return {
      value: signed(MORNING_FLAG.value - mid(PERSONAL_NORMAL.systolic)),
      unit: 'mmHg',
      status: MORNING_FLAG.status,
      caption: `Systolic vs your normal · re-check ${MORNING_FLAG.recheckAt}`,
    };
  }
  return { value: 'OK', unit: '', status: 'normal' as Status, caption: 'All four signals in your normal' };
}

const STATUS_WORD: Record<Status, string> = {
  normal: 'Normal',
  advisory: 'Advisory',
  caution: 'Caution',
  warning: 'Warning',
  critical: 'Critical',
};

export default function HomePage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { evaluations } = useVitals();
  const now = useNow(15_000);
  const routineRef = useRef<HTMLElement>(null);
  const [water, setWater] = useState(GOALS.water.value);
  const [lastDrink, setLastDrink] = useState<number | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const unread = 0;
  const [, setFamilyOpen] = useState(false);


  const body = useMemo(() => bodyFocus(evaluations), [evaluations]);
  const nextTask = ROUTINE_TASKS.find((t) => t.state === 'next');
  const done = ROUTINE_TASKS.filter((t) => t.state === 'done').length;
  const needs = body.status !== 'normal' ? 1 : 0;

  const scrollToRoutine = () => routineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openTask = (t: RoutineTask) => {
    if (t.target === 'home') scrollToRoutine();
    else onNavigate(t.target);
  };
  const drink = () => {
    setWater((w) => Math.min(GOALS.water.target + 1, Math.round((w + 0.25) * 100) / 100));
    setLastDrink(Date.now());
  };
  const drinkMeta = lastDrink ? 'last drink just now' : `last drink ${GOALS.water.lastDrinkHoursAgo} h ago`;
  const waterDone = water >= GOALS.water.target;

  return (
    <div className="page page--home">
      <section className="home-hero">
        <h1 className="home-greeting">Hi, {ASTRONAUT.name}</h1>
        <span className="needs-chip">
          <i className={`needs-chip__dot needs-chip__dot--${needs ? body.status : 'normal'}`} />
          {needs ? `${needs} thing needs you` : 'All good right now'}
        </span>

        <div className="orbit">
          <DomeBackground />

          <OrbitRing>
            <OrbitNode
              position="env"
              label="Environment"
              value={ENVIRONMENT.todayDose.toFixed(1)}
              unit="mSv"
              status="normal"
              statusLabel="Today"
              onClick={() => onNavigate('environment')}
            />
            <OrbitNode
              position="reports"
              label="Reports"
              value="18:00"
              status="advisory"
              statusLabel="Downlink"
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
              statusLabel={nextTask ? 'Re-check' : 'All done'}
              onClick={scrollToRoutine}
            />
            <OrbitNode
              position="family"
              label="Family"
              value={String(unread)}
              status={unread ? 'advisory' : 'normal'}
              statusLabel={unread ? 'New message' : 'Read'}
              onClick={() => setFamilyOpen(true)}
            />
          </OrbitRing>


          <div className="orbit__center">
            <Mascot size={420} state="idle" />
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
            <p className="eyebrow">Routine · Day {TODAY_DAY}</p>
            <h2 className="page-title">Routine</h2>
            <p className="page-sub">Your day on one clock. Tapping a task takes you straight to it.</p>
          </div>
          <span className="count-chip">
            {done} of {ROUTINE_TASKS.length} complete
          </span>
        </div>

        <div className="routine-grid">
          <Card className="routine-grid__clock" title="24-hour routine" aside={<span>tap a dot to open its task</span>}>
            <RoutineClock blocks={ROUTINE_BLOCKS} tasks={ROUTINE_TASKS} now={new Date(now)} day={TODAY_DAY} onTaskClick={openTask} />
            <ul className="clock-legend">
              <li>
                <i className="clock-legend__swatch" style={{ background: '#3d5a73' }} />
                Sleep <span className="mono">22:00 – 06:00</span>
              </li>
              <li>
                <i className="clock-legend__swatch" style={{ background: 'var(--normal)' }} />
                Exercise <span className="mono">10:30 – 12:30</span>
              </li>
              <li>
                <i
                  className="clock-legend__swatch"
                  style={{ background: 'repeating-linear-gradient(90deg, var(--caution) 0 4px, transparent 4px 7px)' }}
                />
                Highest fatigue <span className="mono">14:00 – 16:00</span>
              </li>
            </ul>
          </Card>

          <TaskList tasks={ROUTINE_TASKS} onOpen={openTask} />

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
                  Water is at {water.toFixed(1)} L and sleep averaged {GOALS.sleepAvg} h. A glass now and lights out by 22:00 keeps tomorrow
                  steady.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}