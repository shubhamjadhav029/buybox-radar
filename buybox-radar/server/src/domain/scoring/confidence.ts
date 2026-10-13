import type { Company, ConfidenceLabel } from '@radar/shared';

/**
 * Computes data confidence based on presence of key fields.
 * Confidence = filled fields / 7 total.
 */
export function computeConfidence(company: Company): {
  confidence: number;
  label: ConfidenceLabel;
} {
  const fields = [
    company.employeeCount,
    company.estimatedRevenue,
    company.yearFounded,
    company.ownerName,
    company.email,
    company.phone,
    company.website,
  ];

  const nonNull = fields.filter((v) => v != null).length;
  const confidence = Math.round((nonNull / 7) * 100) / 100;

  let label: ConfidenceLabel;
  if (confidence >= 0.85) {
    label = 'high';
  } else if (confidence >= 0.55) {
    label = 'medium';
  } else {
    label = 'low';
  }

  return { confidence, label };
}
