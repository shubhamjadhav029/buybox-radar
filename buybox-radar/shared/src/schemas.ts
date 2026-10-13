import { z } from 'zod';
import { INDUSTRIES, SUPPORTED_STATES } from './constants';

const range = (minAllowed: number, maxAllowed: number) =>
  z
    .object({
      min: z.number().min(minAllowed).max(maxAllowed),
      max: z.number().min(minAllowed).max(maxAllowed),
    })
    .refine((r) => r.max >= r.min, { message: 'max must be >= min', path: ['max'] });

export const BuyBoxSchema = z.object({
  industries: z.array(z.enum(INDUSTRIES)).min(1).max(5),
  states: z.array(z.enum(SUPPORTED_STATES)).min(1).max(10),
  cities: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  employees: range(1, 10_000),
  revenue: range(0, 1_000_000_000),
  minYearsInBusiness: z.number().int().min(0).max(50).default(10),
  requireOwnerContact: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
});

export type BuyBoxInput = z.input<typeof BuyBoxSchema>;

export const StatusUpdateSchema = z.object({
  status: z.enum(['NEW', 'SHORTLISTED', 'REJECTED']),
});

export const ExportQuerySchema = z.object({
  minScore: z.coerce.number().int().min(0).max(100).default(0),
  shortlistedOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
