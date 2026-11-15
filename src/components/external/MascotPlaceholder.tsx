export interface MascotProps {
  size?: number;
  className?: string;
}

/** Stand-in for your asteroid mascot. Swap it in components/external/index.ts. */
export default function MascotPlaceholder({ size = 120, className }: MascotProps) {
  return (
    <div
      className={className}
      role="img"
      aria-label="MAIA mascot"
      style={{
        width: size,
        height: size,
        borderRadius: '46% 54% 50% 50%',
        background: '#ddd8e6',
        border: '3px solid #1b1b1b',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: Math.max(10, size * 0.12),
        color: '#1b1b1b',
      }}
    >
      MAIA
    </div>
  );
}
