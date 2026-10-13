import React from 'react';
import { Radar } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Radar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">BuyBox Radar</h1>
            <p className="text-xs text-slate-500">Rank acquisition targets by thesis fit</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>SaaSquatch Lead Ranking Engine</span>
        </div>
      </div>
    </header>
  );
}
