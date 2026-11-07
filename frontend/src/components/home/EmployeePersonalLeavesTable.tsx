"use client";

import React, { useState } from 'react';
import { Pagination } from '../ui/Pagination';

export interface PersonalLeaveRecord {
  id: string;
  applicant?: string;
  date?: string;
  dateOfLeave?: string;
  leaveType: string;
  daysApplied?: number;
  duration?: string;
  status: string;
  reason?: string;
}

interface EmployeePersonalLeavesTableProps {
  leaves: PersonalLeaveRecord[];
  isLoading?: boolean;
}

export const EmployeePersonalLeavesTable: React.FC<EmployeePersonalLeavesTableProps> = ({
  leaves,
  isLoading = false,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const paginatedLeaves = leaves.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40">
          Approved
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40">
        Pending
      </span>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] transition-all flex flex-col shadow-xs">
      {/* Header */}
      <div
        className="border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between"
        style={{ padding: '16px 20px' }}
      >
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          My Leaves
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {leaves.length} {leaves.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Table Content */}
      <div className="w-full overflow-x-auto scrollbar-slim" style={{ minHeight: '160px' }}>
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs select-none">
          <thead>
            <tr className="text-gray-700 dark:text-gray-300" style={{ backgroundColor: 'var(--orange-havy-light)' }}>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Date
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Leave Type
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Duration
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Status
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  Loading your leaves...
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-14 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  No leave records found
                </td>
              </tr>
            ) : (
              paginatedLeaves.map((l) => {
                const leaveDate = l.dateOfLeave || l.date || 'N/A';
                const duration = l.duration || `${l.daysApplied || 1} ${(l.daysApplied || 1) === 1 ? 'day' : 'days'}`;
                return (
                  <tr
                    key={l.id}
                    className="hover:bg-[#F6F4F2] dark:hover:bg-[#162032] transition-colors"
                  >
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                      {leaveDate}
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {l.leaveType}
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {duration}
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                      {getStatusBadge(l.status)}
                    </td>
                    <td className="py-2.5 px-3.5 border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={l.reason || ''}>
                      {l.reason || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {leaves.length > 5 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={leaves.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          showPageSize={true}
          pageSizeOptions={[5, 10, 20]}
        />
      )}
    </div>
  );
};

