import type { Company, BuyBox, ScoreComponent, Tone } from '@radar/shared';
import { INDUSTRY_LABELS, isAdjacent, MAX_RANGE_DEVIATION } from '@radar/shared';
import { fmtUsd } from './format';

/** Determines tone based on points vs max. */
export function toneFor(points: number, max: number): Tone {
  if (max === 0) return 'neutral';
  const ratio = points / max;
  if (ratio >= 0.7) return 'positive';
  if (ratio >= 0.3) return 'neutral';
  return 'negative';
}

/**
 * Computes a partial score for range-based components (size, revenue).
 * Uses relative deviation from the range; zero within range, partial outside.
 */
export function rangeScore(
  value: number | null | undefined,
  min: number,
  max: number,
  maxPoints: number,
): number {
  if (value == null) return 0;
  if (value >= min && value <= max) return maxPoints;
  // Edge case: max === 0 and value > 0 → full deviation
  if (max === 0 && value > 0) return 0;
  const d = value < min ? (min - value) / (min || 1) : (value - max) / (max || 1);
  return Math.round(maxPoints * Math.max(0, 1 - d / MAX_RANGE_DEVIATION));
}

/** Industry fit component. */
export function scoreIndustry(
  company: Company,
  buyBox: BuyBox,
): ScoreComponent {
  const max = 25;
  const label = INDUSTRY_LABELS[company.industry] ?? company.industry;
  let points: number;
  let reason: string;

  if (buyBox.industries.includes(company.industry)) {
    points = 25;
    reason = `Exact industry match (${label})`;
  } else if (buyBox.industries.some((ind) => isAdjacent(company.industry, ind))) {
    points = 12;
    reason = `Adjacent industry (${label})`;
  } else {
    points = 0;
    reason = `Outside target industries (${label})`;
  }

  return { key: 'industry', label: 'Industry', points, max, tone: toneFor(points, max), reason };
}

/** Location fit component. */
export function scoreLocation(
  company: Company,
  buyBox: BuyBox,
): ScoreComponent {
  const max = 15;
  const state = company.state;
  const city = company.city.trim();

  if (!buyBox.states.includes(state)) {
    const points = 0;
    return {
      key: 'location',
      label: 'Location',
      points,
      max,
      tone: 'negative',
      reason: `Outside target states (${state})`,
    };
  }

  if (buyBox.cities.length === 0) {
    return {
      key: 'location',
      label: 'Location',
      points: 15,
      max,
      tone: 'positive',
      reason: `In target state (${state})`,
    };
  }

  const cityMatch = buyBox.cities.some(
    (c) => c.trim().toLowerCase() === city.toLowerCase(),
  );

  if (cityMatch) {
    return {
      key: 'location',
      label: 'Location',
      points: 15,
      max,
      tone: 'positive',
      reason: `In target city (${city})`,
    };
  }

  return {
    key: 'location',
    label: 'Location',
    points: 8,
    max,
    tone: 'neutral',
    reason: `In target state (${state}), outside target cities`,
  };
}

/** Team size fit component. */
export function scoreSize(
  company: Company,
  buyBox: BuyBox,
): ScoreComponent {
  const max = 20;
  const n = company.employeeCount;
  const { min, max: rangeMax } = buyBox.employees;

  if (n == null) {
    return { key: 'size', label: 'Team size', points: 0, max, tone: 'negative', reason: 'Employee count unknown' };
  }

  const points = rangeScore(n, min, rangeMax, max);
  let reason: string;

  if (n >= min && n <= rangeMax) {
    reason = `${n} employees — within ${min}–${rangeMax}`;
  } else {
    const d = n < min ? (min - n) / min : (n - rangeMax) / rangeMax;
    const pct = Math.round(d * 100);
    if (d >= MAX_RANGE_DEVIATION) {
      reason = `${n} employees — far ${n < min ? 'below' : 'above'} target range`;
    } else if (n < min) {
      reason = `${n} employees — ${pct}% below minimum (${min})`;
    } else {
      reason = `${n} employees — ${pct}% above maximum (${rangeMax})`;
    }
  }

  return { key: 'size', label: 'Team size', points, max, tone: toneFor(points, max), reason };
}

/** Revenue fit component. */
export function scoreRevenue(
  company: Company,
  buyBox: BuyBox,
): ScoreComponent {
  const max = 15;
  const v = company.estimatedRevenue;
  const { min, max: rangeMax } = buyBox.revenue;

  if (v == null) {
    return { key: 'revenue', label: 'Revenue', points: 0, max, tone: 'negative', reason: 'Revenue unknown' };
  }

  const points = rangeScore(v, min, rangeMax, max);
  let reason: string;

  if (v >= min && v <= rangeMax) {
    reason = `Est. revenue ${fmtUsd(v)} — within ${fmtUsd(min)}–${fmtUsd(rangeMax)}`;
  } else {
    const dRaw = v < min
      ? min === 0 ? 0 : (min - v) / min
      : rangeMax === 0 ? 1 : (v - rangeMax) / rangeMax;
    const pct = Math.round(dRaw * 100);
    if (dRaw >= MAX_RANGE_DEVIATION) {
      reason = `Est. revenue ${fmtUsd(v)} — far ${v < min ? 'below' : 'above'} target range`;
    } else if (v < min) {
      reason = `Est. revenue ${fmtUsd(v)} — ${pct}% below minimum (${fmtUsd(min)})`;
    } else {
      reason = `Est. revenue ${fmtUsd(v)} — ${pct}% above maximum (${fmtUsd(rangeMax)})`;
    }
  }

  return { key: 'revenue', label: 'Revenue', points, max, tone: toneFor(points, max), reason };
}

/** Tenure (succession signal) component. */
export function scoreTenure(
  company: Company,
  buyBox: BuyBox,
  ctx: { currentYear: number },
): ScoreComponent {
  const max = 15;
  const { minYearsInBusiness: minYears } = buyBox;

  if (company.yearFounded == null) {
    return { key: 'tenure', label: 'Tenure (succession)', points: 0, max, tone: 'negative', reason: 'Year founded unknown' };
  }

  const years = ctx.currentYear - company.yearFounded;

  let points: number;
  let reason: string;

  if (years >= minYears + 10) {
    points = 15;
    reason = `${years} yrs in business (≥${minYears + 10} — strong succession signal)`;
  } else if (years >= minYears) {
    points = 10;
    reason = `${years} yrs in business (meets ${minYears}-yr minimum)`;
  } else {
    points = minYears > 0 ? Math.round(10 * years / minYears) : 0;
    reason = `${years} yrs in business (below ${minYears}-yr minimum)`;
  }

  return { key: 'tenure', label: 'Tenure (succession)', points, max, tone: toneFor(points, max), reason };
}

/** Owner reachability component. */
export function scoreOwner(company: Company): ScoreComponent {
  const max = 10;
  const parts: string[] = [];
  let points = 0;

  if (company.ownerName) { points += 5; parts.push(`Owner identified (${company.ownerName})`); }
  if (company.email) { points += 3; parts.push('Email available'); }
  if (company.phone) { points += 2; parts.push('Phone available'); }

  const reason = parts.length > 0 ? parts.join(' · ') : 'No owner or contact data';

  return { key: 'owner', label: 'Owner reachability', points, max, tone: toneFor(points, max), reason };
}
