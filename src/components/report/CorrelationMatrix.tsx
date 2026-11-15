import { useMemo } from 'react';
import { pearson } from '../../utils/stats';
import './report.css';

export interface MatrixVector {
  key: string;
  label: string;
  values: number[];
}

interface CorrelationMatrixProps {
  vectors: MatrixVector[];
  onPick?: (rowKey: string, colKey: string) => void;
  active?: [string, string];
}

function cellStyle(r: number) {
  const a = Math.min(1, Math.abs(r)) * 0.85;
  return {
    background: r >= 0 ? `rgba(232, 118, 43, ${a})` : `rgba(47, 111, 219, ${a})`,
    color: Math.abs(r) > 0.5 ? '#fff' : undefined,
  };
}

/** Pearson r between every pair of daily series. Click a cell to plot that pair. */
export default function CorrelationMatrix({ vectors, onPick, active }: CorrelationMatrixProps) {
  const matrix = useMemo(() => vectors.map((a) => vectors.map((b) => pearson(a.values, b.values))), [vectors]);

  return (
    <div className="corr">
      <div className="table-wrap">
        <table className="corr__table">
          <thead>
            <tr>
              <th />
              {vectors.map((v) => (
                <th key={v.key} scope="col">
                  {v.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vectors.map((row, i) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {vectors.map((col, j) => {
                  const r = matrix[i][j];
                  const isActive =
                    active && ((active[0] === row.key && active[1] === col.key) || (active[1] === row.key && active[0] === col.key));
                  return (
                    <td
                      key={col.key}
                      style={i === j ? undefined : cellStyle(r)}
                      className={`${i === j ? 'is-diag' : ''} ${isActive ? 'is-active' : ''}`}
                      title={`${row.label} × ${col.label}: r = ${r.toFixed(2)}`}
                      onClick={i === j || !onPick ? undefined : () => onPick(row.key, col.key)}
                    >
                      {i === j ? '—' : r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="corr__legend">
        <span>−1 inverse</span>
        <i className="corr__scale" />
        <span>+1 together</span>
      </div>
    </div>
  );
}
