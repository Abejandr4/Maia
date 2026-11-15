import { useEffect, useRef } from 'react';
import './galaxy.css';

const TAU = Math.PI * 2;

interface Dot { x: number; y: number; size: number; phase: number; speed: number; cool: boolean }
interface ArmPoint { r: number; a: number; size: number; alpha: number; color: string }

export default function GalaxyBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const dots: Dot[] = Array.from({ length: 260 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() < 0.07 ? 2 : 1,
      phase: Math.random() * TAU,
      speed: 0.4 + Math.random() * 1.4,
      cool: Math.random() < 0.4,
    }));

    const arms: ArmPoint[] = Array.from({ length: 900 }, (_, i) => {
      const r = Math.pow(Math.random(), 0.65);
      const a = ((i % 3) * TAU) / 3 + r * 5.5 + (Math.random() - 0.5) * (0.3 + r * 0.7);
      const core = r < 0.22;
      return {
        r,
        a,
        size: Math.random() < 0.1 ? 2 : 1,
        alpha: Math.max(0.08, (1 - r) * 0.6),
        color: core ? '255,226,185' : r < 0.55 ? '190,185,255' : '140,170,255',
      };
    });

    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // Espiral
      const cx = w * 0.5;
      const cy = h * 0.4;
      const R = Math.min(w, h) * 0.6;
      const rot = reduce.matches ? 0 : (t / 1000) * 0.03;
      const tilt = -0.35;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35);
      glow.addColorStop(0, 'rgba(255,220,180,0.22)');
      glow.addColorStop(1, 'rgba(255,220,180,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      for (const p of arms) {
        const ang = p.a + rot;
        const dx = Math.cos(ang) * p.r * R;
        const dy = Math.sin(ang) * p.r * R * 0.42;
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fillRect(cx + dx * ct - dy * st, cy + dx * st + dy * ct, p.size, p.size);
      }

      // Estrellas con titileo
      for (const d of dots) {
        const tw = reduce.matches ? 0.8 : 0.45 + 0.55 * Math.sin((t / 1000) * d.speed + d.phase);
        ctx.fillStyle = `rgba(${d.cool ? '200,215,255' : '255,255,255'},${Math.max(0.1, tw).toFixed(2)})`;
        ctx.fillRect(d.x * w, d.y * h, d.size, d.size);
      }
    };

    const loop = (t: number) => {
      if (!document.hidden) draw(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (reduce.matches) draw(0);
      else raf = requestAnimationFrame(loop);
    };

    resize();
    start();
    window.addEventListener('resize', resize);
    reduce.addEventListener('change', start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      reduce.removeEventListener('change', start);
    };
  }, []);

  return <canvas ref={ref} className="galaxy" aria-hidden="true" />;
}