import React from 'react';
import type { Fit } from '@radar/shared';
import { cn } from '../../lib/cn';

interface ScoreBadgeProps {
  score: number;
  fit: Fit;
  showLabel?: boolean;
}

export function ScoreBadge({ score, fit, showLabel = true }: ScoreBadgeProps) {
  const labelText = fit === 'strong' ? 'Strong fit' : fit === 'possible' ? 'Possible' : 'Weak';
  const colorStyles =
    fit === 'strong'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : fit === 'possible'
        ? 'bg-amber-50 text-amber-700 border-amber-300'
        : 'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center justify-center font-bold px-2 py-0.5 text-xs rounded-full border',
          colorStyles,
        )}
      >
        {score}
      </span>
      {showLabel && (
        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
          {labelText}
        </span>
      )}
    </div>
  );
}
