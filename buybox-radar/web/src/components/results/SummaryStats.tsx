import React from 'react';
import { Target, Zap, Award, Clock } from 'lucide-react';

interface SummaryStatsProps {
  totalMatches: number;
  strongFits: number;
  averageScore: number;
  durationMs?: number;
  cacheHit?: boolean;
}

export function SummaryStats({
  totalMatches,
  strongFits,
  averageScore,
  durationMs,
  cacheHit,
}: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {/* Total Matches */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Target className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium">Matching Leads</span>
        </div>
        <p className="text-xl font-bold tracking-tight text-slate-900">{totalMatches}</p>
      </div>

      {/* Strong Fits */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Zap className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium">Strong Fits (≥75)</span>
        </div>
        <p className="text-xl font-bold tracking-tight text-emerald-600">{strongFits}</p>
      </div>

      {/* Average Score */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Award className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium">Avg Fit Score</span>
        </div>
        <p className="text-xl font-bold tracking-tight text-slate-900">{averageScore}</p>
      </div>

      {/* Search Speed & Cache Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium">Latency</span>
          </div>
          {cacheHit && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Cached
            </span>
          )}
        </div>
        <p className="text-xl font-bold tracking-tight text-slate-900">
          {durationMs != null ? `${durationMs} ms` : '—'}
        </p>
      </div>
    </div>
  );
}
