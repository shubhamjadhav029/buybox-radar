/**
 * Format a USD value as a compact string.
 * < 1M → "$123K", >= 1M → "$1.5M"
 */
export function fmtUsd(v: number): string {
  if (v < 1_000_000) {
    return `$${Math.round(v / 1000)}K`;
  }
  return `$${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
}
