import React from 'react';
import type { ScoredLead, CompanyStatus } from '@radar/shared';
import { INDUSTRY_LABELS } from '@radar/shared';
import { ScoreBadge } from './ScoreBadge';
import { ConfidenceChip } from './ConfidenceChip';
import { ScoreBreakdown } from './ScoreBreakdown';
import { fmtUsd, fmtInt, fmtYears } from '../../lib/format';
import { Star, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ResultRowProps {
  lead: ScoredLead;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateStatus: (status: CompanyStatus) => void;
  isUpdatingStatus: boolean;
}

export function ResultRow({
  lead,
  isExpanded,
  onToggleExpand,
  onUpdateStatus,
  isUpdatingStatus,
}: ResultRowProps) {
  const isShortlisted = lead.status === 'SHORTLISTED';
  const industryLabel = INDUSTRY_LABELS[lead.industry] ?? lead.industry;

  return (
    <>
      <tr
        className={cn(
          'hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100',
          isExpanded && 'bg-slate-50/50',
          isShortlisted && 'bg-amber-50/20',
        )}
        onClick={onToggleExpand}
      >
        {/* Star column */}
        <td
          className="py-3 pl-4 pr-2 w-10 text-center"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(isShortlisted ? 'NEW' : 'SHORTLISTED');
          }}
        >
          <button
            type="button"
            disabled={isUpdatingStatus}
            aria-label={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <Star
              className={cn(
                'h-4 w-4 transition-colors',
                isShortlisted ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-slate-500',
              )}
            />
          </button>
        </td>

        {/* Rank */}
        <td className="py-3 px-2 text-xs font-mono font-semibold text-slate-500 w-12">
          #{lead.rank}
        </td>

        {/* Company Name & Location */}
        <td className="py-3 px-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {lead.name}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
              <span>{lead.city}, {lead.state}</span>
              {lead.website && (
                <>
                  <span>•</span>
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline"
                  >
                    <span>web</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </td>

        {/* Industry */}
        <td className="py-3 px-3 text-xs text-slate-700 whitespace-nowrap">
          {industryLabel}
        </td>

        {/* Employees */}
        <td className="py-3 px-3 text-xs font-medium text-slate-700 text-right whitespace-nowrap">
          {fmtInt(lead.employeeCount)}
        </td>

        {/* Est. Revenue */}
        <td className="py-3 px-3 text-xs font-medium text-slate-700 text-right whitespace-nowrap">
          {lead.estimatedRevenue != null ? fmtUsd(lead.estimatedRevenue) : '—'}
        </td>

        {/* Years in business */}
        <td className="py-3 px-3 text-xs text-slate-600 text-right whitespace-nowrap">
          {fmtYears(lead.yearsInBusiness)}
        </td>

        {/* Owner */}
        <td className="py-3 px-3 text-xs text-slate-700 whitespace-nowrap max-w-[130px] truncate">
          {lead.ownerName || <span className="text-slate-400 italic">Unidentified</span>}
        </td>

        {/* Score & Confidence */}
        <td className="py-3 px-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <ScoreBadge score={lead.score} fit={lead.fit} />
            <ConfidenceChip confidence={lead.confidence} />
          </div>
        </td>

        {/* Expand toggle */}
        <td className="py-3 pr-4 pl-2 text-right w-10">
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse score breakdown' : 'Expand score breakdown'}
            className="p-1 rounded hover:bg-slate-200/50 text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
      </tr>

      {/* Expanded Breakdown Row */}
      {isExpanded && (
        <tr>
          <td colSpan={10} className="p-0">
            <ScoreBreakdown
              breakdown={lead.breakdown}
              company={lead}
              onUpdateStatus={onUpdateStatus}
              isUpdatingStatus={isUpdatingStatus}
            />
          </td>
        </tr>
      )}
    </>
  );
}
