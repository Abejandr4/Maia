import { useEffect, useRef, useState } from 'react';
import type { Status } from './types';

/* ---------- Types mirror backend/app/services/environment.py ---------- */

export type DataSource = 'live' | 'cache' | 'seed';

export interface SourceMeta {
  key: string;
  source: DataSource;
  fetchedAt: number;
  ageSeconds: number;
  error: string | null;
}

export interface ScaleInfo {
  scale: number;
  label: string;
  status: Status;
  text?: string;
}

export interface SpaceEvent {
  id: string;
  type: 'SEP' | 'FLR' | 'GST';
  title: string;
  time: string;
  detail: string | null;
  status: Status;
  link?: string;
}

export interface IssPosition {
  latitude: number | null;
  longitude: number | null;
  altitudeKm: number | null;
  velocityKmh: number | null;
  visibility?: string;
  timestamp?: number;
  inSouthAtlanticAnomaly: boolean;
}

export interface EnvironmentSummary {
  overall: { status: Status; label: string };
  spaceWeather: {
    radiation: ScaleInfo;
    radioBlackout: ScaleInfo;
    geomagnetic: ScaleInfo;
    s1ProbabilityNext3Days: number;
    issuedAt: string | null;
    kp: number | null;
    kpSeries: { time: string; kp: number }[];
  };
  events: SpaceEvent[];
  lastSep: SpaceEvent | null;
  iss: IssPosition;
  sources: Record<string, SourceMeta>;
}

/* ---------- Fetch helpers ---------- */

const BASE = import.meta.env.VITE_API_URL ?? ''; // '' → Vite proxy in dev

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { signal });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

/**
 * Polls a backend endpoint. Keeps the last good value if a request fails,
 * so the UI never blanks — `error` tells you the backend is unreachable.
 */
export function usePolling<T>(path: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      try {
        const d = await apiGet<T>(path, ctrl.current.signal);
        if (!alive) return;
        setData(d);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (e) {
        if (alive && (e as Error).name !== 'AbortError') setError((e as Error).message);
      }
    };
    run();
    const id = window.setInterval(run, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
      ctrl.current?.abort();
    };
  }, [path, intervalMs, tick]);

  return { data, error, updatedAt, refresh: () => setTick((t) => t + 1) };
}

export const useEnvironmentSummary = () => usePolling<EnvironmentSummary>('/api/environment/summary', 60_000);
export const useIssPosition = () => usePolling<{ iss: IssPosition; source: SourceMeta }>('/api/environment/iss', 10_000);

/** Worst data source across several datasets, for the "live / cached / offline" pill. */
export function worstSource(sources: SourceMeta[]): DataSource {
  if (sources.some((s) => s.source === 'seed')) return 'seed';
  if (sources.some((s) => s.source === 'cache')) return 'cache';
  return 'live';
}
