import React from 'react';
import type { ScoreComponent, CompanyStatus } from '@radar/shared';
import { Mail, Phone, ExternalLink, Star, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ScoreBreakdownProps {
  breakdown: ScoreComponent[];
  company: {
    id: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    ownerName?: string | null;
    ownerTitle?: string | null;
    ownerLinkedinUrl?: string | null;
    status: CompanyStatus;
  };
  onUpdateStatus: (status: CompanyStatus) => void;
  isUpdatingStatus: boolean;
}

export function ScoreBreakdown({
  breakdown,
  company,
  onUpdateStatus,
  isUpdatingStatus,
}: ScoreBreakdownProps) {
  const isShortlisted = company.status === 'SHORTLISTED';

  const toneBarColor = (tone: ScoreComponent['tone']) => {
    switch (tone) {
      case 'positive':
        return 'bg-emerald-500';
      case 'neutral':
        return 'bg-amber-500';
      case 'negative':
        return 'bg-rose-400';
    }
  };

  return (
    <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-4">
      {/* 6 scoring components breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {breakdown.map((item) => {
          const pct = Math.min(100, Math.max(0, Math.round((item.points / item.max) * 100)));
          return (
            <div
              key={item.key}
              className="rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="font-mono text-slate-500 font-medium">
                  {item.points} / {item.max} pts
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-1.5">
                <div
                  className={cn('h-full transition-all duration-300', toneBarColor(item.tone))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">{item.reason}</p>
            </div>
          );
        })}
      </div>

      {/* Contact & Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
        {/* Contact info */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          {company.ownerName && (
            <span className="font-medium text-slate-800">
              {company.ownerName}
              {company.ownerTitle && (
                <span className="text-slate-500 font-normal"> ({company.ownerTitle})</span>
              )}
            </span>
          )}

          {company.email && (
            <a
              href={`mailto:${company.email}`}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{company.email}</span>
            </a>
          )}

          {company.phone && (
            <a
              href={`tel:${company.phone}`}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{company.phone}</span>
            </a>
          )}

          {company.ownerLinkedinUrl && (
            <a
              href={company.ownerLinkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>LinkedIn Profile</span>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => onUpdateStatus(isShortlisted ? 'NEW' : 'SHORTLISTED')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              isShortlisted
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
            )}
          >
            <Star className={cn('h-3.5 w-3.5', isShortlisted && 'fill-amber-500 text-amber-500')} />
            <span>{isShortlisted ? 'Shortlisted' : 'Shortlist Lead'}</span>
          </button>

          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => onUpdateStatus('REJECTED')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
}
