import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BuyBox, SearchResponse, CompanyStatus } from '@radar/shared';
import { apiFetch } from './client';

export interface MetaOptions {
  industries: { value: string; label: string }[];
  states: string[];
}

export function useOptions() {
  return useQuery<MetaOptions>({
    queryKey: ['meta', 'options'],
    queryFn: () => apiFetch<MetaOptions>('/api/meta/options'),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useRunSearch() {
  const queryClient = useQueryClient();

  return useMutation<SearchResponse, Error, BuyBox>({
    mutationFn: (buyBox: BuyBox) =>
      apiFetch<SearchResponse>('/api/searches', {
        method: 'POST',
        body: JSON.stringify(buyBox),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['currentSearch'], data);
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; status: CompanyStatus },
    Error,
    { companyId: string; status: CompanyStatus },
    { previousSearch?: SearchResponse }
  >({
    mutationFn: ({ companyId, status }) =>
      apiFetch<{ id: string; status: CompanyStatus }>(`/api/companies/${encodeURIComponent(companyId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ companyId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['currentSearch'] });
      const previousSearch = queryClient.getQueryData<SearchResponse>(['currentSearch']);

      if (previousSearch) {
        queryClient.setQueryData<SearchResponse>(['currentSearch'], {
          ...previousSearch,
          results: previousSearch.results.map((r) =>
            r.id === companyId ? { ...r, status } : r,
          ),
        });
      }

      return { previousSearch };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSearch) {
        queryClient.setQueryData(['currentSearch'], context.previousSearch);
      }
    },
  });
}
