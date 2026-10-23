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
      className="w-full bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] transition-all flex flex-col shadow-2xs"
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
      <div className="w-full overflow-x-auto" style={{ minHeight: '160px' }}>
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#334155] bg-gray-50/50 dark:bg-[#162032]">
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Date
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Holiday
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Day
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-xs text-gray-400">
                  Loading holidays...
                </td>
              </tr>
            ) : holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-14 text-xs text-gray-400">
                  No upcoming holidays scheduled
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr
                  key={h.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-[#131d30] transition-colors"
                >
                  <td className="text-xs text-gray-700 dark:text-gray-300 font-medium" style={{ padding: '10px 16px' }}>
                    {h.date}
                  </td>
                  <td className="text-xs font-semibold text-gray-900 dark:text-white" style={{ padding: '10px 16px' }}>
                    {h.holiday}
                  </td>
                  <td className="text-xs text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
                    {h.day}
                  </td>
                  <td className="text-xs text-gray-500 dark:text-gray-400" style={{ padding: '10px 16px' }}>
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
