import type { ScoredLead } from '@radar/shared';

export type SortOption = 'score_desc' | 'employees_desc' | 'revenue_desc' | 'years_desc' | 'name_asc';

export interface Filters {
  minScore: number;
  hasEmail: boolean;
  hasOwner: boolean;
  shortlistedOnly: boolean;
  text: string;
  sort: SortOption;
}

export const defaultFilters: Filters = {
  minScore: 0,
  hasEmail: false,
  hasOwner: false,
  shortlistedOnly: false,
  text: '',
  sort: 'score_desc',
};

export function applyFilters(leads: ScoredLead[], filters: Filters): ScoredLead[] {
  const query = filters.text.trim().toLowerCase();

  const filtered = leads.filter((lead) => {
    // Exclude rejected leads immediately from results
    if (lead.status === 'REJECTED') return false;

    // min score
    if (lead.score < filters.minScore) return false;

    // has email
    if (filters.hasEmail && !lead.email) return false;

    // has owner
    if (filters.hasOwner && !lead.ownerName) return false;

    // shortlisted only
    if (filters.shortlistedOnly && lead.status !== 'SHORTLISTED') return false;

    // text search matches company name or city
    if (query) {
      const matchName = lead.name.toLowerCase().includes(query);
      const matchCity = lead.city.toLowerCase().includes(query);
      if (!matchName && !matchCity) return false;
    }

    return true;
  });

  // Sort
  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'employees_desc':
        return (b.employeeCount ?? 0) - (a.employeeCount ?? 0);
      case 'revenue_desc':
        return (b.estimatedRevenue ?? 0) - (a.estimatedRevenue ?? 0);
      case 'years_desc':
        return (b.yearsInBusiness ?? 0) - (a.yearsInBusiness ?? 0);
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'score_desc':
      default:
        if (b.score !== a.score) return b.score - a.score;
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return a.rank - b.rank;
    }
  });
}
