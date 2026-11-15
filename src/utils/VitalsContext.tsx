import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AlertEntry, Scenario, Status, SymptomEntry, VitalEvaluation, VitalKey, VitalSample } from './types';
import { STATUS_RANK, evaluateSample, worstStatus } from './baselines';
import { INITIAL_ALERTS, INITIAL_SYMPTOMS } from './mockData';
import { TICK_MS, VITAL_NAME, alertLogMessage, alertSpeech, nextSample, seedHistory } from './sensorSim';
import { chime, speak, stopSpeaking } from './tts';

const HISTORY = 48;
const REPEAT_MS = 20_000; // re-announce a persisting alarm every 20 s

export interface SpokenAlert {
  id: string;
  text: string;
  level: Status;
  at: number;
}

export interface VitalsContextValue {
  current: VitalSample;
  history: VitalSample[];
  evaluations: VitalEvaluation[];
  overall: Status;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  evaMode: boolean;
  setEvaMode: (v: boolean) => void;
  /** Where the crew member is (ISS, back on Earth…); a spacewalk is evaMode on top of it. */
  place: Place;
  setPlace: (p: Place) => void;
  /** True once a spacewalk was started in this session (its log goes into the report). */
  evaDone: boolean;
  setEvaDone: (v: boolean) => void;
  voiceOn: boolean;
  setVoiceOn: (v: boolean) => void;
  alerts: AlertEntry[];
  symptoms: SymptomEntry[];
  addSymptom: (entry: Omit<SymptomEntry, 'id'>) => void;
  lastSpoken: SpokenAlert | null;
  dismissSpoken: () => void;
  testVoice: () => void;
}

export type Place = 'iss' | 'earth' | 'lunar' | 'mars';

const VitalsContext = createContext<VitalsContextValue | null>(null);

export function VitalsProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<VitalSample[]>(() => seedHistory(HISTORY));
  const [scenario, setScenarioState] = useState<Scenario>('nominal');
  const [paused, setPaused] = useState(false);
  const [evaMode, setEvaMode] = useState(false);
  const [place, setPlace] = useState<Place>('iss');
  const [evaDone, setEvaDone] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [alerts, setAlerts] = useState<AlertEntry[]>(INITIAL_ALERTS);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>(INITIAL_SYMPTOMS);
  const [lastSpoken, setLastSpoken] = useState<SpokenAlert | null>(null);

  const pendingVoice = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = pendingVoice.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      if (evaMode && voiceOn) stopSpeaking();
    };
  }, [evaMode, voiceOn]);

  const playVoice = useCallback((text: string, level: Status, interrupt: boolean) => {
    if (!evaMode || !voiceOn) return;
    chime(level);
    const timer = window.setTimeout(() => {
      pendingVoice.current.delete(timer);
      speak(text, { interrupt });
    }, 550);
    pendingVoice.current.add(timer);
  }, [evaMode, voiceOn]);

  const scenarioRef = useRef<Scenario>('nominal');
  const announcedRef = useRef<Partial<Record<VitalKey, { status: Status; at: number }>>>({});

  const setScenario = useCallback((s: Scenario) => {
    scenarioRef.current = s;
    setScenarioState(s);
    if (s === 'nominal') {
      stopSpeaking();
      announcedRef.current = {};
    }
  }, []);

  // Sensor feed
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setHistory((prev) => [...prev.slice(-(HISTORY - 1)), nextSample(prev[prev.length - 1], scenarioRef.current)]);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const current = history[history.length - 1];
  const evaluations = useMemo(() => evaluateSample(current), [current]);
  const overall = useMemo(() => worstStatus(evaluations.map((e) => e.status)), [evaluations]);

  // Alert engine: warning/critical → log + chime + spoken alert
  useEffect(() => {
    const now = Date.now();
    const fired: { e: VitalEvaluation; text: string }[] = [];

    for (const e of evaluations) {
      const prev = announcedRef.current[e.key];
      if (STATUS_RANK[e.status] >= STATUS_RANK.warning) {
        const escalated = !prev || STATUS_RANK[e.status] > STATUS_RANK[prev.status];
        if (escalated || now - (prev?.at ?? 0) > REPEAT_MS) {
          announcedRef.current[e.key] = { status: e.status, at: now };
          fired.push({ e, text: alertSpeech(e, evaMode) });
        }
      } else {
        delete announcedRef.current[e.key];
      }
    }
    if (!fired.length) return;

    const source: AlertEntry['source'] = scenarioRef.current === 'nominal' ? 'sensor' : 'simulated';
    setAlerts((prev) => [
      ...fired.map(({ e }, i) => ({
        id: `live-${now}-${i}`,
        vital: VITAL_NAME[e.key],
        message: alertLogMessage(e),
        level: e.status === 'critical' ? ('critical' as const) : ('warning' as const),
        time: new Date(now).toISOString(),
        source,
      })),
      ...prev,
    ]);

    const text = fired.map((f) => f.text).join(' ');
    const level = worstStatus(fired.map((f) => f.e.status));
    setLastSpoken({ id: String(now), text, level, at: now });

    playVoice(text, level, level === 'critical');
  }, [evaluations, evaMode, playVoice]);

  const addSymptom = useCallback((entry: Omit<SymptomEntry, 'id'>) => {
    setSymptoms((prev) => [{ ...entry, id: `s-${Date.now()}` }, ...prev]);
  }, []);

  const dismissSpoken = useCallback(() => setLastSpoken(null), []);

  const testVoice = useCallback(() => {
    playVoice('Voice check. Crew health alerts are active.', 'warning', true);
  }, [playVoice]);

  const value = useMemo<VitalsContextValue>(
    () => ({
      current,
      history,
      evaluations,
      overall,
      scenario,
      setScenario,
      paused,
      setPaused,
      evaMode,
      setEvaMode,
      place,
      setPlace,
      evaDone,
      setEvaDone,
      voiceOn,
      setVoiceOn,
      alerts,
      symptoms,
      addSymptom,
      lastSpoken,
      dismissSpoken,
      testVoice,
    }),
    [current, history, evaluations, overall, scenario, setScenario, paused, evaMode, place, evaDone, voiceOn, alerts, symptoms, addSymptom, lastSpoken, dismissSpoken, testVoice],
  );

  return <VitalsContext.Provider value={value}>{children}</VitalsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVitals() {
  const ctx = useContext(VitalsContext);
  if (!ctx) throw new Error('useVitals must be used inside <VitalsProvider>');
  return ctx;
}
