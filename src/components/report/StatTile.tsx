import './report.css';

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'critical' | 'warning' | 'normal' | 'advisory' | 'neutral';
  small?: boolean;
}

export default function StatTile({ label, value, sub, tone = 'neutral', small }: StatTileProps) {
  return (
    <section className={`stat-tile stat-tile--${tone}`}>
      <p className="stat-tile__label">{label}</p>
      <p className={`stat-tile__value ${small ? 'stat-tile__value--sm' : ''}`}>{value}</p>
      {sub && <p className="stat-tile__sub">{sub}</p>}
    </section>
  );
}
