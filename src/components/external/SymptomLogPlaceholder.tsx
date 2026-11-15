import type { SymptomEntry } from '../../utils/types';

export interface SymptomLogProps {
  onClose: () => void;
  onSubmit?: (entry: Omit<SymptomEntry, 'id'>) => void;
}

/** Stand-in for your symptom log form. Swap it in components/external/index.ts. */
export default function SymptomLogPlaceholder({ onClose, onSubmit }: SymptomLogProps) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p>Your symptom log component renders here. Point the export in components/external/index.ts at it.</p>
      <button
        type="button"
        className="btn btn--primary"
        style={{ justifySelf: 'start' }}
        onClick={() => {
          onSubmit?.({ name: 'Headache', severity: 'mild', note: 'Test entry from placeholder.', time: new Date().toISOString() });
          onClose();
        }}
      >
        Add test entry
      </button>
    </div>
  );
}
