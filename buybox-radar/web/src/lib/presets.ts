import type { BuyBox } from '@radar/shared';

export interface Preset {
  name: string;
  buyBox: BuyBox;
}

export const PRESETS: Preset[] = [
  {
    name: 'HVAC · Texas',
    buyBox: {
      industries: ['hvac'],
      states: ['TX'],
      cities: [],
      employees: { min: 10, max: 50 },
      revenue: { min: 1_000_000, max: 8_000_000 },
      minYearsInBusiness: 10,
      requireOwnerContact: false,
      limit: 100,
    },
  },
  {
    name: 'Home services · Florida',
    buyBox: {
      industries: ['plumbing', 'electrical', 'roofing'],
      states: ['FL'],
      cities: [],
      employees: { min: 5, max: 40 },
      revenue: { min: 800_000, max: 6_000_000 },
      minYearsInBusiness: 10,
      requireOwnerContact: true,
      limit: 100,
    },
  },
  {
    name: 'Dental · AZ & GA',
    buyBox: {
      industries: ['dental-practice'],
      states: ['AZ', 'GA'],
      cities: [],
      employees: { min: 8, max: 40 },
      revenue: { min: 1_500_000, max: 7_000_000 },
      minYearsInBusiness: 12,
      requireOwnerContact: false,
      limit: 100,
    },
  },
];

export const DEFAULT_BUYBOX: BuyBox = PRESETS[0]!.buyBox;
