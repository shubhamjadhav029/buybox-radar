import React, { useState } from 'react';
import type { ScoredLead, CompanyStatus } from '@radar/shared';
import { ResultRow } from './ResultRow';
import { Pagination } from './Pagination';

interface ResultsTableProps {
  leads: ScoredLead[];
  onUpdateStatus: (companyId: string, status: CompanyStatus) => void;
  isUpdatingStatus: boolean;
  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

export function ResultsTable({
  leads,
  onUpdateStatus,
  isUpdatingStatus,
  page,
  onPageChange,
  pageSize = 25,
}: ResultsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(leads.length / pageSize);
  const currentLeads = leads.slice((page - 1) * pageSize, page * pageSize);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 pl-4 pr-2 w-10 text-center">★</th>
              <th className="py-3 px-2 w-12">Rank</th>
              <th className="py-3 px-3">Company</th>
              <th className="py-3 px-3">Industry</th>
              <th className="py-3 px-3 text-right">Employees</th>
              <th className="py-3 px-3 text-right">Est. Revenue</th>
              <th className="py-3 px-3 text-right">Tenure</th>
              <th className="py-3 px-3">Owner</th>
              <th className="py-3 px-3">Thesis Fit</th>
              <th className="py-3 pr-4 pl-2 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentLeads.map((lead) => (
              <ResultRow
                key={lead.id}
                lead={lead}
                isExpanded={expandedId === lead.id}
                onToggleExpand={() => toggleExpand(lead.id)}
                onUpdateStatus={(status) => onUpdateStatus(lead.id, status)}
                isUpdatingStatus={isUpdatingStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={leads.length}
        pageSize={pageSize}
      />
    </div>
  );
}
