import { sourceLinks } from '../../data/maiaData';
import './maia.css';

export type SourceKind = 'real' | 'sample' | 'live' | 'cited' | 'unverified';

const LABEL: Record<SourceKind, string> = {
  real: 'REAL · NASA OSDR',
  sample: 'SAMPLE',
  live: 'LIVE',
  cited: 'CITED',
  unverified: 'UNVERIFIED',
};

/** Small chip that says where a number comes from; hover shows the references. */
export default function SourceTag({ kind, ids, label }: { kind: SourceKind; ids?: string; label?: string }) {
  const refs = ids ? sourceLinks(ids) : [];
  const title = refs.map((r) => `${r.id} – ${r.reference}`).join('\n');
  return (
    <span className={`maia-tag maia-tag--${kind}`} title={title || undefined}>
      {label ?? LABEL[kind]}
      {refs.length > 0 && <span className="maia-tag__ids">{refs.map((r) => r.id).join(' ')}</span>}
    </span>
  );
}
