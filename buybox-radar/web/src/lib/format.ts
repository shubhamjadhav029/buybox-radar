/** Format USD: < 1M -> $123K, >= 1M -> $1.5M */
export function fmtUsd(v: number): string {
  if (v < 1_000_000) {
    return `$${Math.round(v / 1000)}K`;
  }
  return `$${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
}

/** Format integer with commas */
export function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US').format(v);
}

/** Format years in business */
export function fmtYears(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v} yrs`;
}
