import type { ScoredLead } from '@radar/shared';
import { toCsv } from '../lib/csv';

const CSV_HEADERS = [
  'rank',
  'score',
  'fit',
  'name',
  'industry',
  'city',
  'state',
  'website',
  'phone',
  'email',
  'employees',
  'est_revenue_usd',
  'years_in_business',
  'owner_name',
  'owner_title',
  'owner_linkedin',
  'confidence',
  'top_reasons',
  'shortlisted',
];

/** Builds a CSV string from a list of scored leads. */
export function buildCsv(rows: ScoredLead[]): string {
  const dataRows = rows.map((lead) => {
    // top_reasons = two highest-points components' reasons joined by " | "
    const topTwo = [...lead.breakdown]
      .sort((a, b) => b.points - a.points)
      .slice(0, 2)
      .map((c) => c.reason);
    const topReasons = topTwo.join(' | ');

    return [
      lead.rank,
      lead.score,
      lead.fit,
      lead.name,
      lead.industry,
      lead.city,
      lead.state,
      lead.website ?? '',
      lead.phone ?? '',
      lead.email ?? '',
      lead.employeeCount ?? '',
      lead.estimatedRevenue ?? '',
      lead.yearsInBusiness ?? '',
      lead.ownerName ?? '',
      lead.ownerTitle ?? '',
      lead.ownerLinkedinUrl ?? '',
      lead.confidence,
      topReasons,
      lead.status === 'SHORTLISTED' ? 'yes' : 'no',
    ];
  });

  return toCsv(CSV_HEADERS, dataRows);
}
