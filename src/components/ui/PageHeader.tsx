import type { ReactNode } from 'react';
import './ui.css';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}

export default function PageHeader({ eyebrow, title, subtitle, aside }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {aside && <div className="page-head__aside">{aside}</div>}
    </header>
  );
}
