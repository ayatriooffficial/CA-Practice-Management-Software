"use client";

import React from 'react';
import { UpcomingLeaveItem } from '../../services/attendanceApi';

interface UpcomingLeavesTableProps {
  leaves: UpcomingLeaveItem[];
  isLoading?: boolean;
}

export const UpcomingLeavesTable: React.FC<UpcomingLeavesTableProps> = ({
  leaves,
  isLoading = false,
}) => {
  return (
    <div
      className="w-full bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] transition-all flex flex-col shadow-2xs"
    >
      {/* Header */}
      <div
        className="border-b border-gray-100 dark:border-[#334155]"
        style={{ padding: '16px 20px' }}
      >
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          Upcoming Employee Leave
        </h3>
      </div>

      {/* Table Content */}
      <div className="w-full overflow-x-auto" style={{ minHeight: '160px' }}>
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#334155] bg-gray-50/50 dark:bg-[#162032]">
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Date
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Name
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Leave Type
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Day
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Status
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-xs text-gray-400">
                  Loading leaves...
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-xs text-gray-400">
                  No rows
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-[#131d30] transition-colors"
                >
                  <td className="text-xs text-gray-700 dark:text-gray-300 font-medium" style={{ padding: '10px 16px' }}>
                    {l.date}
                  </td>
                  <td className="text-xs font-semibold text-gray-900 dark:text-white" style={{ padding: '10px 16px' }}>
                    {l.name}
                  </td>
                  <td className="text-xs text-gray-600 dark:text-gray-300" style={{ padding: '10px 16px' }}>
                    {l.leaveType}
                  </td>
                  <td className="text-xs text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                    {l.day}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                    {l.duration}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
