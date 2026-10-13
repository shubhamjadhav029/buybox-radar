import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  normalizeDomain,
  normalizePhone,
  similarity,
} from './normalize';

describe('normalizeName', () => {
  it('lowercases and replaces & with and', () => {
    expect(normalizeName('Ramirez Heating & Air, LLC')).toBe('ramirez heating and air');
  });

  it('drops stop tokens', () => {
    expect(normalizeName('Smith Plumbing Inc')).toBe('smith plumbing');
  });

  it('handles multiple spaces', () => {
    expect(normalizeName('  Jones   Roofing   Co  ')).toBe('jones roofing');
  });

  it('strips punctuation', () => {
    expect(normalizeName("O'Brien's HVAC LLC")).toBe('obriens hvac');
  });
});

describe('normalizeDomain', () => {
  it('strips protocol and www', () => {
    expect(normalizeDomain('https://www.example.com')).toBe('example.com');
  });

  it('strips path and query', () => {
    expect(normalizeDomain('http://mysite.example/path?q=1')).toBe('mysite.example');
  });

  it('returns null for empty string', () => {
    expect(normalizeDomain('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizeDomain(null)).toBeNull();
  });

  it('returns null for generic domain (facebook.com)', () => {
    expect(normalizeDomain('https://www.facebook.com/myhvacpage')).toBeNull();
  });

  it('returns null for yelp.com', () => {
    expect(normalizeDomain('https://yelp.com/biz/smith-plumbing')).toBeNull();
  });

  it('handles URL without protocol', () => {
    expect(normalizeDomain('mysite.example')).toBe('mysite.example');
  });
});

describe('normalizePhone', () => {
  it('normalizes formatted US phone', () => {
    expect(normalizePhone('(512) 555-0142')).toBe('5125550142');
  });

  it('normalizes +1 format', () => {
    expect(normalizePhone('+1 512-555-0142')).toBe('5125550142');
  });

  it('returns null for too short', () => {
    expect(normalizePhone('555-1234')).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizePhone(null)).toBeNull();
  });

  it('handles 11-digit number starting with 1', () => {
    expect(normalizePhone('15125550142')).toBe('5125550142');
  });
});

describe('similarity', () => {
  it('identical strings return 1', () => {
    expect(similarity('hello', 'hello')).toBe(1);
  });

  it('completely different strings return low value', () => {
    expect(similarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('both empty returns 0', () => {
    expect(similarity('', '')).toBe(0);
  });

  it('similar strings return high value', () => {
    expect(similarity('ramirez heating and air', 'ramirez heating air')).toBeGreaterThan(0.8);
  });
});
