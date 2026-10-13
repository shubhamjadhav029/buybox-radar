import { describe, it, expect } from 'vitest';
import { dedupe } from './index';
import type { RawCompany } from '@radar/shared';

function makeCompany(overrides: Partial<RawCompany> & Pick<RawCompany, 'name' | 'city' | 'state' | 'industry'>): RawCompany {
  return {
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

describe('dedupe', () => {
  it('1. Same domain, different names → merged', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Smith HVAC LLC', city: 'Austin', state: 'TX', industry: 'hvac', website: 'https://www.smithhvac.example' }),
      makeCompany({ name: 'Smith Heating & Air', city: 'Dallas', state: 'TX', industry: 'hvac', website: 'https://www.smithhvac.example', sources: ['directory_b'] }),
    ];
    const { companies, stats } = dedupe(records);
    expect(companies).toHaveLength(1);
    expect(stats.duplicatesRemoved).toBe(1);
  });

  it('2. Same phone in different formats → merged', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Jones Plumbing', city: 'Austin', state: 'TX', industry: 'plumbing', phone: '(512) 555-0142' }),
      makeCompany({ name: 'Jones Plumbing Co', city: 'Austin', state: 'TX', industry: 'plumbing', phone: '+1 512-555-0142', sources: ['directory_b'] }),
    ];
    const { companies, stats } = dedupe(records);
    expect(companies).toHaveLength(1);
    expect(stats.duplicatesRemoved).toBe(1);
  });

  it('3. Name with & vs and, same city → merged', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Ramirez Heating & Air LLC', city: 'Austin', state: 'TX', industry: 'hvac' }),
      makeCompany({ name: 'Ramirez Heating and Air', city: 'Austin', state: 'TX', industry: 'hvac', sources: ['directory_b'] }),
    ];
    const { companies, stats } = dedupe(records);
    expect(companies).toHaveLength(1);
    expect(stats.duplicatesRemoved).toBe(1);
  });

  it('4. Same name, different city → NOT merged', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Smith HVAC LLC', city: 'Austin', state: 'TX', industry: 'hvac' }),
      makeCompany({ name: 'Smith HVAC LLC', city: 'Dallas', state: 'TX', industry: 'hvac' }),
    ];
    const { companies, stats } = dedupe(records);
    expect(companies).toHaveLength(2);
    expect(stats.duplicatesRemoved).toBe(0);
  });

  it('5. Same name + city, different state → NOT merged (blocking)', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Smith HVAC LLC', city: 'Memphis', state: 'TN', industry: 'hvac' }),
      makeCompany({ name: 'Smith HVAC LLC', city: 'Memphis', state: 'GA', industry: 'hvac' }),
    ];
    const { companies, stats } = dedupe(records);
    expect(companies).toHaveLength(2);
    expect(stats.duplicatesRemoved).toBe(0);
  });

  it('6. Merge fills nulls from secondary and unions sources', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Smith HVAC', city: 'Austin', state: 'TX', industry: 'hvac', phone: '5125550100', sources: ['directory_a'] }),
      makeCompany({ name: 'Smith HVAC LLC', city: 'Austin', state: 'TX', industry: 'hvac', phone: '5125550100', email: 'info@smith.example', sources: ['directory_b'] }),
    ];
    const { companies } = dedupe(records);
    expect(companies).toHaveLength(1);
    expect(companies[0]!.email).toBe('info@smith.example');
    expect(companies[0]!.sources).toContain('directory_a');
    expect(companies[0]!.sources).toContain('directory_b');
  });

  it('7. Generic domain (facebook.com) alone does not trigger merge', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'Smith HVAC', city: 'Austin', state: 'TX', industry: 'hvac', website: 'https://facebook.com/smithhvac' }),
      makeCompany({ name: 'Jones Plumbing', city: 'Austin', state: 'TX', industry: 'plumbing', website: 'https://facebook.com/jonesplumbing', sources: ['directory_b'] }),
    ];
    const { companies, stats } = dedupe(records);
    expect(companies).toHaveLength(2);
    expect(stats.duplicatesRemoved).toBe(0);
  });

  it('8. Stats numbers are correct', () => {
    const records: RawCompany[] = [
      makeCompany({ name: 'A HVAC LLC', city: 'Austin', state: 'TX', industry: 'hvac', phone: '5125550001' }),
      makeCompany({ name: 'A Heating', city: 'Austin', state: 'TX', industry: 'hvac', phone: '5125550001', sources: ['directory_b'] }),
      makeCompany({ name: 'B Plumbing', city: 'Houston', state: 'TX', industry: 'plumbing' }),
    ];
    const { stats } = dedupe(records);
    expect(stats.input).toBe(3);
    expect(stats.output).toBe(2);
    expect(stats.duplicatesRemoved).toBe(1);
  });
});
