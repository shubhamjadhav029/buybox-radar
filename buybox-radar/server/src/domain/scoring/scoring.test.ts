import { describe, it, expect } from 'vitest';
import { scoreCompany, fitFor, rankLeads } from './index';
import { rangeScore } from './components';
import { computeConfidence } from './confidence';
import type { Company, BuyBox } from '@radar/shared';

const CTX = { currentYear: 2026 };

const BB1: BuyBox = {
  industries: ['hvac'],
  states: ['TX'],
  cities: [],
  employees: { min: 10, max: 50 },
  revenue: { min: 1_000_000, max: 8_000_000 },
  minYearsInBusiness: 10,
  requireOwnerContact: false,
  limit: 100,
};

function makeCompany(overrides: Partial<Company> & Pick<Company, 'id' | 'name' | 'city' | 'state' | 'industry'>): Company {
  return {
    normalizedName: overrides.name.toLowerCase(),
    domain: null,
    status: 'NEW',
    website: null,
    phone: null,
    email: null,
    street: null,
    zip: null,
    employeeCount: null,
    estimatedRevenue: null,
    revenueConfidence: null,
    yearFounded: null,
    ownerName: null,
    ownerTitle: null,
    ownerLinkedinUrl: null,
    rating: null,
    reviewCount: null,
    sources: ['directory_a'],
    ...overrides,
  };
}

// Company A: perfect score 100
const companyA = makeCompany({
  id: 'a',
  name: 'Dana Ruiz HVAC',
  industry: 'hvac',
  city: 'Austin',
  state: 'TX',
  employeeCount: 25,
  estimatedRevenue: 3_200_000,
  yearFounded: 2001,
  ownerName: 'Dana Ruiz',
  email: 'dana@dana.example',
  phone: '5125550101',
});

// Company B: plumbing (adjacent), 8 emp, no revenue, founded 2012, no owner, email only
const companyB = makeCompany({
  id: 'b',
  name: 'Jones Plumbing',
  industry: 'plumbing',
  city: 'Dallas',
  state: 'TX',
  employeeCount: 8,
  estimatedRevenue: null,
  yearFounded: 2012,
  ownerName: null,
  email: 'info@jones.example',
  phone: null,
});

// Company C: hvac, TX, 40 emp, $500K, founded 2022, nothing else
const companyC = makeCompany({
  id: 'c',
  name: 'Star HVAC',
  industry: 'hvac',
  city: 'Houston',
  state: 'TX',
  employeeCount: 40,
  estimatedRevenue: 500_000,
  yearFounded: 2022,
});

describe('rangeScore', () => {
  it('rangeScore(800_000, 1_000_000, 8_000_000, 15) === 9', () => {
    expect(rangeScore(800_000, 1_000_000, 8_000_000, 15)).toBe(9);
  });

  it('rangeScore(500_000, 1_000_000, 8_000_000, 15) === 0', () => {
    expect(rangeScore(500_000, 1_000_000, 8_000_000, 15)).toBe(0);
  });

  it('rangeScore(null, ...) === 0', () => {
    expect(rangeScore(null, 1_000_000, 8_000_000, 15)).toBe(0);
  });

  it('rangeScore(60, 10, 50, 20) === 12 (d=0.2)', () => {
    expect(rangeScore(60, 10, 50, 20)).toBe(12);
  });

  it('value within range returns maxPoints', () => {
    expect(rangeScore(30, 10, 50, 20)).toBe(20);
  });
});

describe('scoreCompany — worked examples (currentYear=2026)', () => {
  it('Company A scores 100 (strong)', () => {
    const result = scoreCompany(companyA, BB1, CTX);
    expect(result.score).toBe(100);
    expect(result.fit).toBe('strong');
    expect(result.breakdown).toHaveLength(6);
    // Verify breakdown sums to score
    expect(result.breakdown.reduce((s, c) => s + c.points, 0)).toBe(100);
  });

  it('Company A breakdown: industry=25, location=15, size=20, revenue=15, tenure=15, owner=10', () => {
    const { breakdown } = scoreCompany(companyA, BB1, CTX);
    const byKey = Object.fromEntries(breakdown.map((c) => [c.key, c.points]));
    expect(byKey['industry']).toBe(25);
    expect(byKey['location']).toBe(15);
    expect(byKey['size']).toBe(20);
    expect(byKey['revenue']).toBe(15);
    expect(byKey['tenure']).toBe(15); // 25 years >= 20
    expect(byKey['owner']).toBe(10);
  });

  it('Company B scores 52 (possible)', () => {
    const result = scoreCompany(companyB, BB1, CTX);
    expect(result.score).toBe(52);
    expect(result.fit).toBe('possible');
  });

  it('Company B breakdown: industry=12(adjacent), location=15, size=12(d=0.2), revenue=0, tenure=10(14yrs), owner=3(email)', () => {
    const { breakdown } = scoreCompany(companyB, BB1, CTX);
    const byKey = Object.fromEntries(breakdown.map((c) => [c.key, c.points]));
    expect(byKey['industry']).toBe(12);
    expect(byKey['location']).toBe(15);
    expect(byKey['size']).toBe(12);
    expect(byKey['revenue']).toBe(0);
    expect(byKey['tenure']).toBe(10);
    expect(byKey['owner']).toBe(3);
  });

  it('Company C scores 64 (possible)', () => {
    const result = scoreCompany(companyC, BB1, CTX);
    expect(result.score).toBe(64);
    expect(result.fit).toBe('possible');
  });

  it('Company C breakdown: industry=25, location=15, size=20, revenue=0, tenure=4, owner=0', () => {
    const { breakdown } = scoreCompany(companyC, BB1, CTX);
    const byKey = Object.fromEntries(breakdown.map((c) => [c.key, c.points]));
    expect(byKey['industry']).toBe(25);
    expect(byKey['location']).toBe(15);
    expect(byKey['size']).toBe(20);
    expect(byKey['revenue']).toBe(0); // d=0.5, exactly at boundary => 0
    expect(byKey['tenure']).toBe(4); // round(10 * 4/10)
    expect(byKey['owner']).toBe(0);
  });
});

describe('fitFor', () => {
  it('>=75 is strong', () => expect(fitFor(75)).toBe('strong'));
  it('>=50 is possible', () => expect(fitFor(50)).toBe('possible'));
  it('<50 is weak', () => expect(fitFor(49)).toBe('weak'));
  it('100 is strong', () => expect(fitFor(100)).toBe('strong'));
  it('74 is possible', () => expect(fitFor(74)).toBe('possible'));
});

describe('confidence', () => {
  it('all fields present = high confidence', () => {
    const c = computeConfidence({
      ...companyA,
      website: 'https://a.example',
    });
    expect(c.confidence).toBeCloseTo(1.0);
    expect(c.label).toBe('high');
  });

  it('no optional fields = low confidence', () => {
    const sparse = makeCompany({ id: 'x', name: 'X', city: 'TX', state: 'TX', industry: 'hvac' });
    const c = computeConfidence(sparse);
    expect(c.confidence).toBe(0);
    expect(c.label).toBe('low');
  });
});

describe('tenure edge cases', () => {
  it('yearFounded null → 0 points', () => {
    const c = makeCompany({ id: 't1', name: 'T', city: 'Austin', state: 'TX', industry: 'hvac' });
    const r = scoreCompany(c, BB1, CTX);
    const tenure = r.breakdown.find((b) => b.key === 'tenure')!;
    expect(tenure.points).toBe(0);
  });

  it('years >= minYears+10 → 15 points', () => {
    const c = makeCompany({ id: 't2', name: 'T', city: 'Austin', state: 'TX', industry: 'hvac', yearFounded: 2000 });
    const r = scoreCompany(c, BB1, CTX);
    const tenure = r.breakdown.find((b) => b.key === 'tenure')!;
    expect(tenure.points).toBe(15); // 26 years >= 20
  });
});

describe('owner points', () => {
  it('ownerName=5, email=3, phone=2 → 10', () => {
    const c = makeCompany({ id: 'o1', name: 'O', city: 'Austin', state: 'TX', industry: 'hvac', ownerName: 'Bob', email: 'b@b.example', phone: '5125550100' });
    const r = scoreCompany(c, BB1, CTX);
    const owner = r.breakdown.find((b) => b.key === 'owner')!;
    expect(owner.points).toBe(10);
  });

  it('no owner/contact → 0', () => {
    const c = makeCompany({ id: 'o2', name: 'O', city: 'Austin', state: 'TX', industry: 'hvac' });
    const r = scoreCompany(c, BB1, CTX);
    const owner = r.breakdown.find((b) => b.key === 'owner')!;
    expect(owner.points).toBe(0);
  });
});

describe('rankLeads', () => {
  it('sorts by score desc then assigns rank', () => {
    const leads = [companyB, companyA, companyC].map((c) => scoreCompany(c, BB1, CTX));
    const ranked = rankLeads(leads, 100);
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score);
  });

  it('respects limit', () => {
    const leads = [companyA, companyB, companyC].map((c) => scoreCompany(c, BB1, CTX));
    const ranked = rankLeads(leads, 2);
    expect(ranked).toHaveLength(2);
  });

  it('deterministic output for same input', () => {
    const leads = [companyA, companyB, companyC].map((c) => scoreCompany(c, BB1, CTX));
    const r1 = rankLeads(leads, 100);
    const r2 = rankLeads(leads, 100);
    expect(r1.map((l) => l.id)).toEqual(r2.map((l) => l.id));
  });
});
