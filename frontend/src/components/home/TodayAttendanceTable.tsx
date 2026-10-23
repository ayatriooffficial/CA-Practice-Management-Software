"use client";

import React, { useState, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { TodayAttendanceRow } from '../../services/attendanceApi';

interface TodayAttendanceTableProps {
  rows: TodayAttendanceRow[];
  selectedDate: string; // 'YYYY-MM-DD'
  onDateChange: (date: string) => void;
  isLoading?: boolean;
}

export const TodayAttendanceTable: React.FC<TodayAttendanceTableProps> = ({
  rows,
  selectedDate,
  onDateChange,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  // Filter rows by employee name or email
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.employee?.name?.toLowerCase().includes(q) ||
        r.employee?.email?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // Pagination slice
  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  // Formatted date display for picker button
  const formattedDateButton = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Attendance badge styles
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

  return (
    <div
      className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-all flex flex-col"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Table Header Controls */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800"
        style={{
          padding: '16px 20px',
          gap: '16px',
        }}
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Today&apos;s Attendance
        </h3>

        {/* Controls on Right */}
        <div className="flex items-center" style={{ gap: '12px' }}>
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="text-xs rounded-lg pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 focus:outline-hidden focus:border-purple-600 w-44 sm:w-56"
            />
          </div>

          {/* Date Picker Button */}
          <label className="relative flex items-center cursor-pointer">
            <div
              className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-gray-50/50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              style={{ gap: '8px' }}
            >
              <span>{formattedDateButton}</span>
              <CalendarIcon size={14} className="text-gray-400" />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-auto cursor-pointer"
            />
          </label>

          {/* Three Dots Menu */}
          <button
            type="button"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Single Continuous Scrollable Table */}
      <div
        className="w-full overflow-x-auto"
        style={{
          minHeight: '240px',
        }}
      >
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              {/* Sticky first column */}
              <th
                className="sticky left-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xs text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800"
                style={{ padding: '12px 20px' }}
              >
                Employee
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Attendance
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Status
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Clock In &amp; Out
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Location
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Name Of The ...
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Geo Location
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Office Location
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Distance (Radius)
              </th>
              <th className="text-xs font-semibold text-gray-500 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                Break
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-xs text-gray-400">
                  Loading attendance records...
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-xs text-gray-400">
                  No attendance records found for this date.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => {
                const bStyle = getBadgeStyle(r.attendanceBadge);
                const isLate = r.status === 'Late';
                const inTimeColor = isLate ? '#ef4444' : '#10b981';

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Sticky Employee Avatar + Name */}
                    <td
                      className="sticky left-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs border-r border-gray-100 dark:border-gray-800"
                      style={{ padding: '12px 20px' }}
                    >
                      <div className="flex items-center" style={{ gap: '10px' }}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: '#6366f1' }}
                        >
                          {r.employee?.initials || 'U'}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {r.employee?.name}
                        </span>
                      </div>
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

                    {/* Status (On Time / Late / -) */}
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

                    {/* Clock In & Out: 3-part format */}
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex items-center text-xs font-medium" style={{ gap: '10px' }}>
                        <span style={{ color: inTimeColor }}>
                          {r.clockInAndOut?.inTime || '00:00'}
                        </span>
                        <span className="text-gray-400">
                          {r.clockInAndOut?.totalHours || '00h:00m'}
                        </span>
                        <span style={{ color: '#f97316' }}>
                          {r.clockInAndOut?.outTime || '00:00'}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.location || '-'}
                    </td>

                    {/* Name of Location */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.nameOfTheLocation || '-'}
                    </td>

                    {/* Geo Location */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.geoLocation || '-'}
                    </td>

                    {/* Office Location */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.officeLocation || '-'}
                    </td>

                    {/* Distance (Radius) */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.distanceRadius || '-'}
                    </td>

                    {/* Break */}
                    <td className="text-xs text-gray-600 dark:text-gray-400" style={{ padding: '12px 16px' }}>
                      {r.breakMinutes || '00:00'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Standard Table Pagination Footer */}
      <div
        className="flex items-center justify-end border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400"
        style={{
          padding: '12px 20px',
          gap: '24px',
        }}
      >
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span>Rows per page:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">50</span>
        </div>

        <span>
          {totalCount === 0
            ? '0-0 of 0'
            : `${(page - 1) * rowsPerPage + 1}–${Math.min(
                page * rowsPerPage,
                totalCount
              )} of ${totalCount}`}
        </span>

        <div className="flex items-center" style={{ gap: '4px' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
