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
      className="w-full bg-white dark:bg-[#1e293b] rounded-none border border-gray-200 dark:border-[#334155] transition-all flex flex-col shadow-2xs"
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
      <div className="w-full overflow-x-auto scrollbar-slim" style={{ minHeight: '160px' }}>
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs select-none">
          <thead>
            <tr className="text-gray-700 dark:text-gray-300" style={{ backgroundColor: "var(--orange-havy-light)" }}>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Date
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Name
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Leave Type
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Day
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Status
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  Loading leaves...
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  No rows
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-[#F6F4F2] dark:hover:bg-[#162032] transition-colors"
                >
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {l.date}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs font-semibold text-gray-900 dark:text-white">
                    {l.name}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-600 dark:text-gray-300">
                    {l.leaveType}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400">
                    {l.day}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400">
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
