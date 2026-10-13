import React from 'react';

interface RangeInputsProps {
  label: string;
  min: number;
  max: number;
  onChange: (range: { min: number; max: number }) => void;
  prefix?: string;
  helper?: (v: number) => string;
  error?: string;
  minLimit?: number;
  step?: number;
}

export function RangeInputs({
  label,
  min,
  max,
  onChange,
  prefix,
  helper,
  error,
  minLimit = 0,
  step = 1,
}: RangeInputsProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        {helper && (
          <span className="text-[11px] font-medium text-slate-500">
            {helper(min)} – {helper(max)}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-500">
              {prefix}
            </span>
          )}
          <input
            type="number"
            min={minLimit}
            step={step}
            value={isNaN(min) ? '' : min}
            onChange={(e) => onChange({ min: e.target.value === '' ? 0 : Number(e.target.value), max })}
            placeholder="Min"
            className={`w-full rounded-lg border bg-white py-1.5 pr-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
              prefix ? 'pl-6' : 'pl-2.5'
            } ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
          />
        </div>
        <span className="text-xs text-slate-400">to</span>
        <div className="relative flex-1">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-500">
              {prefix}
            </span>
          )}
          <input
            type="number"
            min={minLimit}
            step={step}
            value={isNaN(max) ? '' : max}
            onChange={(e) => onChange({ min, max: e.target.value === '' ? 0 : Number(e.target.value) })}
            placeholder="Max"
            className={`w-full rounded-lg border bg-white py-1.5 pr-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
              prefix ? 'pl-6' : 'pl-2.5'
            } ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
