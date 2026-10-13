import React from 'react';
import type { ConfidenceLabel } from '@radar/shared';
import { cn } from '../../lib/cn';

interface ConfidenceChipProps {
  confidence: number;
  label?: ConfidenceLabel;
}

export function ConfidenceChip({ confidence, label }: ConfidenceChipProps) {
  const computedLabel: ConfidenceLabel =
    label ?? (confidence >= 0.85 ? 'high' : confidence >= 0.55 ? 'medium' : 'low');

  const styles = {
    high: 'border-emerald-300 text-emerald-700 bg-emerald-50/50',
    medium: 'border-amber-300 text-amber-700 bg-amber-50/50',
    low: 'border-slate-300 text-slate-600 bg-slate-50',
  }[computedLabel];

  const text = computedLabel.charAt(0).toUpperCase() + computedLabel.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-tight',
        styles,
      )}
      title={`Data confidence: ${Math.round(confidence * 100)}%`}
    >
      {text} conf.
    </span>
  );
}
