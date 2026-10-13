import type { Industry, StateCode } from './constants';

export type CompanyStatus = 'NEW' | 'SHORTLISTED' | 'REJECTED';
export type Fit = 'strong' | 'possible' | 'weak';
export type ConfidenceLabel = 'high' | 'medium' | 'low';
export type ScoreKey = 'industry' | 'location' | 'size' | 'revenue' | 'tenure' | 'owner';
export type Tone = 'positive' | 'neutral' | 'negative';

export interface NumberRange {
  min: number;
  max: number;
}

export interface BuyBox {
  industries: Industry[];
  states: StateCode[];
  cities: string[];
  employees: NumberRange;
  revenue: NumberRange;
  minYearsInBusiness: number;
  requireOwnerContact: boolean;
  limit: number;
}

/** A company record as produced by a source (before DB ids). */
export interface RawCompany {
  name: string;
  industry: Industry;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  city: string;
  state: StateCode;
  zip?: string | null;
  employeeCount?: number | null;
  estimatedRevenue?: number | null;
  revenueConfidence?: number | null;
  yearFounded?: number | null;
  ownerName?: string | null;
  ownerTitle?: string | null;
  ownerLinkedinUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  sources: string[];
}

export interface Company extends RawCompany {
  id: string;
  normalizedName: string;
  domain: string | null;
  status: CompanyStatus;
}

export interface ScoreComponent {
  key: ScoreKey;
  label: string;
  points: number;
  max: number;
  tone: Tone;
  reason: string;
}

export interface ScoredLead extends Company {
  rank: number;
  score: number;
  fit: Fit;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  yearsInBusiness: number | null;
  breakdown: ScoreComponent[];
}

export interface SearchMeta {
  cacheHit: boolean;
  durationMs: number;
  candidateCount: number;
  resultCount: number;
  createdAt: string;
}

export interface SearchResponse {
  search: { id: string; buyBox: BuyBox; meta: SearchMeta };
  results: ScoredLead[];
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
