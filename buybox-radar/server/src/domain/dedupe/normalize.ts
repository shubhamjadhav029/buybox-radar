import { distance } from 'fastest-levenshtein';

export const GENERIC_DOMAINS = [
  'facebook.com',
  'yelp.com',
  'linkedin.com',
  'instagram.com',
  'google.com',
  'business.site',
  'wixsite.com',
  'squarespace.com',
  'godaddysites.com',
  'weebly.com',
];

const STOP_TOKENS = new Set([
  'llc',
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'co',
  'company',
  'ltd',
  'llp',
  'pllc',
  'pc',
  'the',
]);

/**
 * Normalizes a company name for duplicate matching.
 * Lowercases, replaces & with 'and', removes punctuation, drops common legal suffixes.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_TOKENS.has(token))
    .join(' ')
    .trim();
}

/**
 * Extracts and normalizes a domain from a website URL.
 * Returns null for generic domains or invalid URLs.
 */
export function normalizeDomain(website: string | null | undefined): string | null {
  if (!website || website.trim() === '') return null;
  try {
    // Add protocol if missing for URL parsing
    const urlStr = website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`;
    const url = new URL(urlStr);
    let domain = url.hostname.toLowerCase();
    // Strip www.
    if (domain.startsWith('www.')) domain = domain.slice(4);
    if (!domain || domain === '') return null;
    if (GENERIC_DOMAINS.includes(domain)) return null;
    return domain;
  } catch {
    return null;
  }
}

/**
 * Normalizes a phone number to a 10-digit string.
 * Returns null if result is not exactly 10 digits.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // Drop leading 1 if 11 digits
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return normalized.length === 10 ? normalized : null;
}

/**
 * Computes string similarity using Levenshtein distance (0..1).
 * Returns 0 if both strings are empty.
 */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - distance(a, b) / maxLen;
}
