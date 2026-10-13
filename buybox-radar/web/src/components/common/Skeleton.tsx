import React from 'react';

interface SkeletonRowsProps {
  count?: number;
}

export function SkeletonRows({ count = 5 }: SkeletonRowsProps) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="bg-slate-50 px-6 py-3.5 flex gap-4">
        <div className="h-4 w-12 bg-slate-200 rounded"></div>
        <div className="h-4 w-48 bg-slate-200 rounded"></div>
        <div className="h-4 w-28 bg-slate-200 rounded"></div>
        <div className="h-4 w-20 bg-slate-200 rounded"></div>
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
        <div className="h-4 w-16 bg-slate-200 rounded ml-auto"></div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4">
          <div className="h-5 w-8 bg-slate-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded"></div>
            <div className="h-3 w-28 bg-slate-100 rounded"></div>
          </div>
          <div className="h-4 w-24 bg-slate-100 rounded"></div>
          <div className="h-4 w-16 bg-slate-100 rounded"></div>
          <div className="h-4 w-20 bg-slate-100 rounded"></div>
          <div className="h-8 w-16 bg-slate-200 rounded-full ml-auto"></div>
        </div>
      ))}
    </div>
  );
}
