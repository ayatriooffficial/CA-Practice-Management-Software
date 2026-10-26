"use client";

import React from 'react';
import { MonthlyRecordItem } from '../../services/attendanceApi';

interface MonthlyAttendanceTableProps {
  records: MonthlyRecordItem[];
  isLoading?: boolean;
}

export const MonthlyAttendanceTable: React.FC<MonthlyAttendanceTableProps> = ({
  records,
  isLoading = false,
}) => {
  // Badge styles with dark mode support
  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case 'Present':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
      case 'Absent':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40';
      case 'On Leave':
        return 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40';
      case 'Half Day':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
      case 'Week Off':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
      case 'Holiday':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
      default:
        return 'bg-gray-100 dark:bg-[#162032] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#334155]';
    }
  };

  // Only previous 5 days and today (no future records)
  const filteredRecords = records.filter((r) => !r.isFuture);

  return (
    <div
      className="w-full bg-white dark:bg-[#1e293b] rounded-none border border-gray-200 dark:border-[#334155] transition-all flex flex-col shadow-2xs"
    >
      {/* Table Header */}
      <div
        className="flex items-center justify-between border-b border-gray-100 dark:border-[#334155]"
        style={{
          padding: '16px 20px',
        }}
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Attendance Details
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Previous 5 Days &amp; Today
        </span>
      </div>

      {/* Scrollable Table */}
      <div
        className="w-full overflow-x-auto"
        style={{
          minHeight: '200px',
        }}
      >
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#334155] bg-gray-50/50 dark:bg-[#162032]">
              <th
                className="sticky left-0 z-10 bg-gray-50/95 dark:bg-[#162032]/95 backdrop-blur-xs text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-[#334155]"
                style={{ padding: '12px 20px' }}
              >
                Date
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Day
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Attendance
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Status
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Clock In
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Clock Out
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Total Hours
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Location
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Break
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-xs text-gray-400">
                  Loading attendance details...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-xs text-gray-400">
                  No attendance records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const badgeClass = getBadgeClass(r.attendanceBadge);

                return (
                  <tr
                    key={r.date}
                    className="hover:bg-gray-50/70 dark:hover:bg-[#131d30] transition-colors"
                  >
                    {/* Sticky Date */}
                    <td
                      className="sticky left-0 z-10 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xs text-xs font-medium text-gray-900 dark:text-white border-r border-gray-100 dark:border-[#334155]"
                      style={{ padding: '12px 20px' }}
                    >
                      {r.date}
                    </td>

                    {/* Day */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.day}
                    </td>

                    {/* Attendance Badge */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border inline-block ${badgeClass}`}
                      >
                        {r.attendanceBadge}
                      </span>
                    </td>

                    {/* Status */}
                    <td
                      className="text-xs font-medium"
                      style={{
                        padding: '12px 16px',
                        color:
                          r.status === 'On Time'
                            ? '#059669'
                            : r.status === 'Late'
                            ? '#dc2626'
                            : 'inherit',
                      }}
                    >
                      {r.status}
                    </td>

                    {/* Clock In */}
                    <td className="text-xs text-emerald-600 font-medium" style={{ padding: '12px 16px' }}>
                      {r.clockIn}
                    </td>

                    {/* Clock Out */}
                    <td className="text-xs text-orange-600 font-medium" style={{ padding: '12px 16px' }}>
                      {r.clockOut}
                    </td>

                    {/* Total Hours */}
                    <td className="text-xs font-medium text-gray-700 dark:text-gray-300" style={{ padding: '12px 16px' }}>
                      {r.totalHours}
                    </td>

                    {/* Location */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.location}
                    </td>

                    {/* Break */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.breakMinutes}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
