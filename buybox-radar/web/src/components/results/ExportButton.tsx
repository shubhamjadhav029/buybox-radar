import React from 'react';
import { exportUrl } from '../../api/client';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  searchId: string;
  minScore: number;
  shortlistedOnly: boolean;
  disabled?: boolean;
}

export function ExportButton({
  searchId,
  minScore,
  shortlistedOnly,
  disabled = false,
}: ExportButtonProps) {
  const url = exportUrl(searchId, { minScore, shortlistedOnly });

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed shadow-xs"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Export CSV</span>
      </button>
    );
  }

  return (
    <a
      href={url}
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 transition-colors"
    >
      <Download className="h-3.5 w-3.5 text-slate-500" />
      <span>Export CSV</span>
    </a>
  );
}
