import React, { useState } from 'react';
import { BuyBoxSchema, type BuyBox } from '@radar/shared';
import type { MetaOptions } from '../../api/hooks';
import { ChipMultiSelect } from './ChipMultiSelect';
import { TagInput } from './TagInput';
import { RangeInputs } from './RangeInputs';
import { fmtUsd } from '../../lib/format';
import { Search, Loader2 } from 'lucide-react';

interface BuyBoxFormProps {
  value: BuyBox;
  onChange: (b: BuyBox) => void;
  onSubmit: (b: BuyBox) => void;
  isPending: boolean;
  options?: MetaOptions;
}

export function BuyBoxForm({ value, onChange, onSubmit, isPending, options }: BuyBoxFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stateOptions = (options?.states ?? []).map((st) => ({ value: st, label: st }));
  const industryOptions = options?.industries ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = BuyBoxSchema.safeParse(value);
    if (!result.success) {
      const errMap: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errMap[path] = issue.message;
      }
      setErrors(errMap);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Industries */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">Target Industries</label>
          <span className="text-[11px] text-slate-400">1–5 max</span>
        </div>
        <div className="mt-1">
          <ChipMultiSelect
            options={industryOptions}
            value={value.industries}
            onChange={(inds) => onChange({ ...value, industries: inds as BuyBox['industries'] })}
            max={5}
          />
        </div>
        {errors['industries'] && <p className="mt-1 text-[11px] text-rose-500">{errors['industries']}</p>}
      </div>

      {/* States */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">States</label>
          <span className="text-[11px] text-slate-400">At least 1</span>
        </div>
        <div className="mt-1">
          <ChipMultiSelect
            options={stateOptions}
            value={value.states}
            onChange={(sts) => onChange({ ...value, states: sts as BuyBox['states'] })}
          />
        </div>
        {errors['states'] && <p className="mt-1 text-[11px] text-rose-500">{errors['states']}</p>}
      </div>

      {/* Cities */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">Target Cities (Optional)</label>
          <span className="text-[11px] text-slate-400">Up to 10</span>
        </div>
        <div className="mt-1">
          <TagInput
            value={value.cities ?? []}
            onChange={(cities) => onChange({ ...value, cities })}
            placeholder="Type city name and press Enter..."
            max={10}
          />
        </div>
        {errors['cities'] && <p className="mt-1 text-[11px] text-rose-500">{errors['cities']}</p>}
      </div>

      {/* Employees Range */}
      <RangeInputs
        label="Employee Count"
        min={value.employees.min}
        max={value.employees.max}
        minLimit={1}
        onChange={(emp) => onChange({ ...value, employees: emp })}
        error={errors['employees'] || errors['employees.min'] || errors['employees.max']}
      />

      {/* Revenue Range */}
      <RangeInputs
        label="Est. Annual Revenue"
        min={value.revenue.min}
        max={value.revenue.max}
        prefix="$"
        step={50000}
        helper={fmtUsd}
        onChange={(rev) => onChange({ ...value, revenue: rev })}
        error={errors['revenue'] || errors['revenue.min'] || errors['revenue.max']}
      />

      {/* Min Years in Business */}
      <div>
        <label className="block text-xs font-semibold text-slate-700">Min. Years in Business</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={50}
            value={isNaN(value.minYearsInBusiness) ? '' : value.minYearsInBusiness}
            onChange={(e) =>
              onChange({
                ...value,
                minYearsInBusiness: e.target.value === '' ? 0 : Number(e.target.value),
              })
            }
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-xs text-slate-500">years minimum</span>
        </div>
        {errors['minYearsInBusiness'] && (
          <p className="mt-1 text-[11px] text-rose-500">{errors['minYearsInBusiness']}</p>
        )}
      </div>

      {/* Require Owner Contact Toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <span className="block text-xs font-semibold text-slate-700">Require Owner Contact</span>
          <span className="text-[11px] text-slate-500">Only leads with owner + email or phone</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.requireOwnerContact}
          onClick={() => onChange({ ...value, requireOwnerContact: !value.requireOwnerContact })}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            value.requireOwnerContact ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value.requireOwnerContact ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Result Limit */}
      <div>
        <label className="block text-xs font-semibold text-slate-700">Result Limit</label>
        <select
          value={value.limit}
          onChange={(e) => onChange({ ...value, limit: Number(e.target.value) })}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value={50}>50 companies</option>
          <option value={100}>100 companies</option>
          <option value={250}>250 companies</option>
          <option value={500}>500 companies</option>
        </select>
      </div>

      {/* Run Search Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Scanning Candidates...</span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            <span>Find & Rank Targets</span>
          </>
        )}
      </button>
    </form>
  );
}
