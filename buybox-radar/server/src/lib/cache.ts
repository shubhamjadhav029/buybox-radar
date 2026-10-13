import { LRUCache } from 'lru-cache';
import type { SearchResponse } from '@radar/shared';

interface CacheOptions {
  max: number;
  ttlMs: number;
}

export interface SearchCache {
  get(key: string): SearchResponse | undefined;
  set(key: string, value: SearchResponse): void;
  clear(): void;
}

/** Creates an LRU cache for search responses keyed by canonical buy-box hash. */
export function createSearchCache(opts: CacheOptions): SearchCache {
  const cache = new LRUCache<string, SearchResponse>({
    max: opts.max,
    ttl: opts.ttlMs,
  });

  return {
    get: (key) => cache.get(key),
    set: (key, value) => { cache.set(key, value); },
    clear: () => { cache.clear(); },
  };
}
