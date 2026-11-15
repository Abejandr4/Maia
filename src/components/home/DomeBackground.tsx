import './dome.css';

// Paralelos (ángulos de latitud) y meridianos (semiejes) de la retícula
const LATS = [78, 62, 46, 30, 14, 0, -16];
const MERIDIANS = [500, 410, 300, 170];

export default function DomeBackground() {
  return (
    <div className="dome" aria-hidden="true">
      <div className="dome__sphere">
        <svg className="dome__grid" viewBox="0 0 1000 1000">
          {LATS.map((deg) => {
            const a = (deg * Math.PI) / 180;
            const r = 500 * Math.cos(a);
            return <ellipse key={deg} cx="500" cy={500 - 500 * Math.sin(a)} rx={r} ry={r * 0.16} />;
          })}
          {MERIDIANS.map((rx) => (
            <ellipse key={rx} cx="500" cy="500" rx={rx} ry="500" />
          ))}
          <line x1="500" y1="0" x2="500" y2="1000" />
        </svg>
      </div>
    </div>
  );
}