import React from 'react';
import type { Filters, SortOption } from '../../lib/filters';
import { Search } from 'lucide-react';

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  filteredCount: number;
}

export function FilterBar({ filters, onChange, filteredCount }: FilterBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search text input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={filters.text}
            onChange={(e) => onChange({ ...filters, text: e.target.value })}
            placeholder="Search company name or city..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sort by:</span>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value as SortOption })}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="score_desc">Score (High to Low)</option>
            <option value="employees_desc">Employees (Most)</option>
            <option value="revenue_desc">Revenue (Highest)</option>
            <option value="years_desc">Years in Business (Oldest)</option>
            <option value="name_asc">Company Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Filter Row: Slider + Checkboxes */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
        {/* Min score slider */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Min Fit Score: <span className="font-semibold text-indigo-600">{filters.minScore}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}
            className="h-1.5 w-28 sm:w-36 rounded-lg bg-slate-200 accent-indigo-600 cursor-pointer"
          />
        </div>

        {/* Checkbox filters */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={filters.hasEmail}
              onChange={(e) => onChange({ ...filters, hasEmail: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span>Has email</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={filters.hasOwner}
              onChange={(e) => onChange({ ...filters, hasOwner: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span>Has owner</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={filters.shortlistedOnly}
              onChange={(e) => onChange({ ...filters, shortlistedOnly: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="font-medium text-amber-700">★ Shortlisted only</span>
          </label>
        </div>

        {/* Showing count indicator */}
        <div className="text-[11px] font-medium text-slate-500 ml-auto">
          Showing <span className="font-semibold text-slate-800">{filteredCount}</span> results
        </div>
      </div>
    </div>
  );
}
