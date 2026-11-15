import type { ReactNode } from 'react';
import './ui.css';

interface CardProps {
  title?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export default function Card({ title, aside, className = '', children }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && (
        <header className="card__head">
          {title && <h3 className="card__title">{title}</h3>}
          {aside && <div className="card__aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
