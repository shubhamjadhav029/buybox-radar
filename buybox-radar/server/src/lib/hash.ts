import { createHash } from 'node:crypto';
import type { BuyBox } from '@radar/shared';

/** Returns a canonical (sorted) version of a buy-box for stable cache keys. */
export function canonicalizeBuyBox(b: BuyBox): BuyBox {
  return {
    ...b,
    industries: [...b.industries].sort(),
    states: [...b.states].sort(),
    cities: [...b.cities].map((c) => c.trim().toLowerCase()).sort(),
  };
}

/** Returns a SHA-256 hex hash of the canonical buy-box. */
export function buyBoxHash(b: BuyBox): string {
  const canonical = canonicalizeBuyBox(b);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
