import React from 'react';
import { PRESETS, type Preset } from '../../lib/presets';
import type { BuyBox } from '@radar/shared';
import { Sparkles } from 'lucide-react';

interface PresetChipsProps {
  onSelectPreset: (buyBox: BuyBox) => void;
  activeBuyBox?: BuyBox;
}

export function PresetChips({ onSelectPreset }: PresetChipsProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
        <span>Try a preset thesis</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset: Preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onSelectPreset(preset.buyBox)}
            className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
