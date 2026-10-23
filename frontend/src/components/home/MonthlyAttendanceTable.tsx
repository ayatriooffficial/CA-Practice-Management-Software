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
  // Badge styles
  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'Present':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'Absent':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
      case 'On Leave':
        return { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' };
      case 'Half Day':
        return { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' };
      case 'Week Off':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'Holiday':
        return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d8fd' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
    }
  };

  // Only previous 5 days and today (no future records)
  const filteredRecords = records.filter((r) => !r.isFuture);

  return (
    <div
      className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-all flex flex-col"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Table Header */}
      <div
        className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800"
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
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <th
                className="sticky left-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800"
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
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
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
                const bStyle = getBadgeStyle(r.attendanceBadge);

                return (
                  <tr
                    key={r.date}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Sticky Date */}
                    <td
                      className="sticky left-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs text-xs font-medium text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-800"
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
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold border inline-block"
                        style={{
                          backgroundColor: bStyle.bg,
                          color: bStyle.text,
                          borderColor: bStyle.border,
                        }}
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
