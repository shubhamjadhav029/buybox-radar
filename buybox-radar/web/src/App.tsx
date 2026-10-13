import React, { useState, useMemo } from 'react';
import type { BuyBox, SearchResponse, CompanyStatus } from '@radar/shared';
import { DEFAULT_BUYBOX } from './lib/presets';
import { defaultFilters, applyFilters, type Filters } from './lib/filters';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOptions, useRunSearch, useUpdateStatus } from './api/hooks';
import { Header } from './components/layout/Header';
import { PresetChips } from './components/buybox/PresetChips';
import { BuyBoxForm } from './components/buybox/BuyBoxForm';
import { SummaryStats } from './components/results/SummaryStats';
import { FilterBar } from './components/results/FilterBar';
import { ResultsTable } from './components/results/ResultsTable';
import { ExportButton } from './components/results/ExportButton';
import { EmptyState } from './components/common/EmptyState';
import { ErrorBanner } from './components/common/ErrorBanner';
import { SkeletonRows } from './components/common/Skeleton';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

export default function App() {
  const [buyBox, setBuyBox] = useLocalStorage<BuyBox>('radar_buybox', DEFAULT_BUYBOX);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState<number>(1);

  // Queries & Mutations
  const { data: options } = useOptions();
  const searchMutation = useRunSearch();
  const updateStatusMutation = useUpdateStatus();

  // Execute search
  const handleRunSearch = (bb: BuyBox) => {
    setPage(1);
    searchMutation.mutate(bb);
  };

  const handleSelectPreset = (presetBb: BuyBox) => {
    setBuyBox(presetBb);
    handleRunSearch(presetBb);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleUpdateStatus = (companyId: string, status: CompanyStatus) => {
    updateStatusMutation.mutate({ companyId, status });
  };

  const searchData: SearchResponse | undefined = searchMutation.data;
  const rawResults = searchData?.results ?? [];

  // Filter & sort
  const filteredResults = useMemo(() => {
    return applyFilters(rawResults, filters);
  }, [rawResults, filters]);

  // Summary statistics
  const stats = useMemo(() => {
    if (!rawResults.length) {
      return { totalMatches: 0, strongFits: 0, averageScore: 0 };
    }
    const nonRejected = rawResults.filter((r) => r.status !== 'REJECTED');
    const strongFits = nonRejected.filter((r) => r.score >= 75).length;
    const avgScore = nonRejected.length
      ? Math.round(nonRejected.reduce((acc, curr) => acc + curr.score, 0) / nonRejected.length)
      : 0;

    return {
      totalMatches: nonRejected.length,
      strongFits,
      averageScore: avgScore,
    };
  }, [rawResults]);

  const hasSearched = !!searchData;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Preset Chips + BuyBox Form */}
          <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <PresetChips onSelectPreset={handleSelectPreset} activeBuyBox={buyBox} />
              <div className="pt-4 border-t border-slate-100">
                <BuyBoxForm
                  value={buyBox}
                  onChange={setBuyBox}
                  onSubmit={handleRunSearch}
                  isPending={searchMutation.isPending}
                  options={options}
                />
              </div>
            </div>
          </aside>

          {/* Main Column: Results & Analysis */}
          <section className="lg:col-span-8 xl:col-span-8 space-y-4">
            {/* Error Banner */}
            {searchMutation.isError && (
              <ErrorBanner
                message={searchMutation.error.message || 'Failed to scan candidate companies'}
                onRetry={() => handleRunSearch(buyBox)}
              />
            )}

            {/* Loading State */}
            {searchMutation.isPending && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                    <span>Analyzing Thesis Fit...</span>
                  </h2>
                </div>
                <SkeletonRows count={6} />
              </div>
            )}

            {/* Results Display */}
            {!searchMutation.isPending && hasSearched && (
              <div>
                {/* Stats Strip */}
                <SummaryStats
                  totalMatches={stats.totalMatches}
                  strongFits={stats.strongFits}
                  averageScore={stats.averageScore}
                  durationMs={searchData?.search.meta.durationMs}
                  cacheHit={searchData?.search.meta.cacheHit}
                />

                {/* Filter Bar with Export Button */}
                <div className="flex flex-col gap-2">
                  <FilterBar
                    filters={filters}
                    onChange={handleFilterChange}
                    filteredCount={filteredResults.length}
                  />

                  <div className="flex justify-end mb-2">
                    <ExportButton
                      searchId={searchData.search.id}
                      minScore={filters.minScore}
                      shortlistedOnly={filters.shortlistedOnly}
                      disabled={filteredResults.length === 0}
                    />
                  </div>
                </div>

                {/* Table or Zero-Results State */}
                {filteredResults.length > 0 ? (
                  <ResultsTable
                    leads={filteredResults}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdatingStatus={updateStatusMutation.isPending}
                    page={page}
                    onPageChange={setPage}
                    pageSize={25}
                  />
                ) : (
                  <EmptyState
                    title="No companies match the active filters"
                    hint="Try adjusting the minimum fit score slider, clearing text filters, or widening target states in your buy-box."
                  />
                )}
              </div>
            )}

            {/* Initial Empty State before first search */}
            {!searchMutation.isPending && !hasSearched && !searchMutation.isError && (
              <EmptyState
                title="Define your acquisition thesis to start"
                hint="Select a preset buy-box on the left or customize your criteria (industry, geography, size, revenue) to view ranked target leads."
                icon={<Sparkles className="h-7 w-7 text-indigo-500" />}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
