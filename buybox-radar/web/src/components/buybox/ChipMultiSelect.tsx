import React from 'react';
import { cn } from '../../lib/cn';

interface Option {
  value: string;
  label: string;
}

interface ChipMultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (val: string[]) => void;
  max?: number;
}

export function ChipMultiSelect({ options, value, onChange, max }: ChipMultiSelectProps) {
  const toggle = (optVal: string) => {
    if (value.includes(optVal)) {
      onChange(value.filter((v) => v !== optVal));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, optVal]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = value.includes(opt.value);
        const isDisabled = !isSelected && !!max && value.length >= max;

        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            onClick={() => toggle(opt.value)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
              isSelected
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
              isDisabled && 'opacity-40 cursor-not-allowed hover:bg-white hover:border-slate-200',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
