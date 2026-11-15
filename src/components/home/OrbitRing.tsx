import { Children, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface OrbitRingProps {
  children: ReactNode;
  className?: string;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Positions its children in an elliptical orbit around the container center.
 * Adjusted from CSS using variables (see home.css). Does not use React state:
 * writes transform/opacity directly to the DOM to avoid re-rendering every frame.
 **/
export default function OrbitRing({ children, className }: OrbitRingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const count = items.length;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || count === 0) return;

    const slots = Array.from(root.querySelectorAll<HTMLElement>(':scope > .orbit-ring__slot'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const step = (Math.PI * 2) / count;

    let w = 0;
    let h = 0;
    let period = 70; // segundos por vuelta
    let tilt = -6; // grados
    let radiusScale = 1;
    let minScale = 0.78;
    let maxScale = 1.08;
    let minOpacity = 1;

    let phase = -Math.PI / 2;
    let speedK = 1;
    let hovered = false;
    let focused = false;
    let raf = 0;
    let last = 0;

    const readCss = () => {
      const cs = getComputedStyle(root);
      const num = (name: string, fallback: number) => {
        const v = parseFloat(cs.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
      };
      period = Math.max(5, num('--orbit-period', 70));
      tilt = num('--orbit-tilt', -6);
      radiusScale = num('--orbit-radius-scale', 1);
      minScale = num('--orbit-min-scale', 0.78);
      maxScale = num('--orbit-max-scale', 1.08);
      minOpacity = num('--orbit-min-opacity', 1);
      w = root.clientWidth;
      h = root.clientHeight;
    };

    const draw = () => {
      // On narrow screens, the nodes shrink along with the orbit.
      const sizeK = clamp(w / 1000, 0.6, 1);
      const pad = 110 * sizeK * maxScale;
      const rx = Math.max(0, w / 2 - pad) * radiusScale;
      const ry = Math.max(0, h / 2 - pad) * radiusScale;
      const t = (tilt * Math.PI) / 180;
      const ct = Math.cos(t);
      const st = Math.sin(t);

      slots.forEach((slot, i) => {
        const a = phase + i * step;
        const s = Math.sin(a);
        const x0 = Math.cos(a) * rx;
        const y0 = s * ry;
        const x = x0 * ct - y0 * st;
        const y = x0 * st + y0 * ct;
        const depth = (s + 1) / 2; // 0 = al fondo, 1 = al frente
        const scale = (minScale + (maxScale - minScale) * depth) * sizeK;

        slot.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${scale.toFixed(3)})`;
        slot.style.opacity = minOpacity >= 1 ? '1' : (minOpacity + (1 - minOpacity) * depth).toFixed(2);
        slot.style.zIndex = depth > 0.5 ? '3' : '1';
      });
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      // Smoothly pauses and resumes on hover or keyboard focus.
      const target = hovered || focused ? 0 : 1;
      speedK += (target - speedK) * Math.min(1, dt * 6);
      phase += ((Math.PI * 2) / period) * dt * speedK;
      draw();
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (reduce.matches) {
        phase = -Math.PI / 2; // static, distributed in a circle
        draw();
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    const onOver = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.orbit-ring__slot')) hovered = true;
    };
    const onOut = () => {
      hovered = false;
    };
    const onFocusIn = () => {
      focused = true;
    };
    const onFocusOut = () => {
      focused = false;
    };

    const ro = new ResizeObserver(() => {
      readCss();
      draw();
    });

    readCss();
    ro.observe(root);
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    reduce.addEventListener('change', start);
    start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      reduce.removeEventListener('change', start);
    };
  }, [count]);

  return (
    <div ref={rootRef} className={className ? `orbit-ring ${className}` : 'orbit-ring'}>
      {items.map((child, i) => (
        <div className="orbit-ring__slot" key={i}>
          {child}
        </div>
      ))}
    </div>
  );
}