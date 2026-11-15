export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function std(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const A = a.slice(0, n);
  const B = b.slice(0, n);
  const ma = mean(A);
  const mb = mean(B);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = A[i] - ma;
    const y = B[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export const zScore = (v: number, m: number, s: number) => (s ? (v - m) / s : 0);

export function scaleLinear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

export function extent(xs: number[], pad = 0): [number, number] {
  let lo = Math.min(...xs);
  let hi = Math.max(...xs);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const p = (hi - lo) * pad;
  return [lo - p, hi + p];
}

export function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

export function niceTicks(lo: number, hi: number, count = 4) {
  const step = niceStep((hi - lo) / count);
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

export function describeCorrelation(r: number) {
  const a = Math.abs(r);
  if (a < 0.2) return 'no meaningful relationship';
  const strength = a < 0.4 ? 'weak' : a < 0.6 ? 'moderate' : 'strong';
  return `${strength} ${r > 0 ? 'positive' : 'negative'} relationship`;
}
