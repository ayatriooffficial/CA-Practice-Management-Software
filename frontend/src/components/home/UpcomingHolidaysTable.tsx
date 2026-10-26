"use client";

import React from 'react';
import { UpcomingHolidayItem } from '../../services/attendanceApi';

interface UpcomingHolidaysTableProps {
  holidays: UpcomingHolidayItem[];
  isLoading?: boolean;
}

export const UpcomingHolidaysTable: React.FC<UpcomingHolidaysTableProps> = ({
  holidays,
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
          Upcoming Holidays
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
                Holiday
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Day
              </th>
              <th className="py-2.5 px-3.5 font-semibold border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  Loading holidays...
                </td>
              </tr>
            ) : holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-14 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  No upcoming holidays scheduled
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr
                  key={h.id}
                  className="hover:bg-[#F6F4F2] dark:hover:bg-[#162032] transition-colors"
                >
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {h.date}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs font-semibold text-gray-900 dark:text-white">
                    {h.holiday}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400">
                    {h.day}
                  </td>
                  <td className="py-2.5 px-3.5 border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400">
                    {h.description}
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
