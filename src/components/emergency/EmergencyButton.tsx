import './emergency.css';

/** Red top-bar button that opens the emergency screen. */
export default function EmergencyButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="em-trigger" onClick={onClick} aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
        <path d="M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9" />
      </svg>
      Emergency
    </button>
  );
}
