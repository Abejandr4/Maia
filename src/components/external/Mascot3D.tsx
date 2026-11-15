import { useEffect, useRef, useState } from 'react';
import MascotPlaceholder from './MascotPlaceholder';
import type { MascotProps } from './MascotPlaceholder';
import type { AsteroidScene } from './mascot/asteroidScene';
import type { MascotState } from './mascot/mascotStates';
import './mascot/mascot.css';

export interface Mascot3DProps extends MascotProps {
  /** Mood of the mascot. Drive it from habits only, never from medical values. */
  state?: MascotState;
}

type Status = 'loading' | 'ready' | 'failed';

/**
 * 3D asteroid mascot. Drop-in replacement for MascotPlaceholder:
 * same props (size, className) plus an optional `state`.
 * While Three.js loads, or if WebGL is unavailable, the placeholder is shown.
 */
export default function Mascot3D({ size = 120, className, state = 'idle' }: Mascot3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AsteroidScene | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  // Create the scene once. Three.js is imported lazily so it gets its own chunk.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let instance: AsteroidScene | null = null;

    import('./mascot/asteroidScene')
      .then(({ createAsteroidScene }) => {
        if (cancelled) return;
        instance = createAsteroidScene(host);
        sceneRef.current = instance;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
      instance?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Keep the mood in sync. Also runs when the scene becomes ready.
  useEffect(() => {
    sceneRef.current?.setState(state);
  }, [state, status]);

  const classes = className ? `mascot3d ${className}` : 'mascot3d';

  return (
    <div className={classes} style={{ width: size, height: size }} role="img" aria-label="MAIA mascot">
      <div ref={hostRef} className="mascot3d__stage" aria-hidden="true" />
      {status !== 'ready' && (
        <div className="mascot3d__fallback" aria-hidden="true">
          <MascotPlaceholder size={size} />
        </div>
      )}
    </div>
  );
}
