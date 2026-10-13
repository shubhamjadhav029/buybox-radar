export const INDUSTRIES = [
  'hvac',
  'plumbing',
  'electrical',
  'roofing',
  'landscaping',
  'pest-control',
  'cleaning-services',
  'auto-repair',
  'dental-practice',
  'veterinary-clinic',
  'laundromat',
  'self-storage',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  hvac: 'HVAC',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  roofing: 'Roofing',
  landscaping: 'Landscaping',
  'pest-control': 'Pest Control',
  'cleaning-services': 'Cleaning Services',
  'auto-repair': 'Auto Repair',
  'dental-practice': 'Dental Practice',
  'veterinary-clinic': 'Veterinary Clinic',
  laundromat: 'Laundromat',
  'self-storage': 'Self-Storage',
};

/** Industries in the same group are "adjacent" (partial industry credit). */
export const ADJACENT_GROUPS: Industry[][] = [
  ['hvac', 'plumbing', 'electrical', 'roofing'],
  ['landscaping', 'pest-control', 'cleaning-services'],
  ['dental-practice', 'veterinary-clinic'],
];

export const SUPPORTED_STATES = [
  'TX',
  'FL',
  'CA',
  'AZ',
  'GA',
  'NC',
  'OH',
  'IL',
  'PA',
  'TN',
] as const;
export type StateCode = (typeof SUPPORTED_STATES)[number];

export const SCORE_WEIGHTS = {
  industry: 25,
  location: 15,
  size: 20,
  revenue: 15,
  tenure: 15,
  owner: 10,
} as const; // sums to 100

export const FIT_BANDS = { strong: 75, possible: 50 } as const;
export const MAX_RANGE_DEVIATION = 0.5;

/** Returns true if industries a and b are in the same adjacent group. */
export function isAdjacent(a: Industry, b: Industry): boolean {
  return ADJACENT_GROUPS.some((group) => group.includes(a) && group.includes(b));
}
