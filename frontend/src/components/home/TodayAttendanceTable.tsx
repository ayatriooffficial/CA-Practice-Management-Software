"use client";

import React, { useState, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, MoreVertical, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
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

  // Attendance badge styles with full dark mode support
  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case 'Present':
        return 'bg-[#E8F8F0] dark:bg-emerald-950/40 text-[#10B981] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40';
      case 'Absent':
        return 'bg-[#FEE2E2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-300 border-rose-200 dark:border-rose-800/40';
      case 'On Leave':
        return 'bg-[#FFF0E6] dark:bg-orange-950/40 text-[#F97316] dark:text-orange-300 border-orange-200 dark:border-orange-800/40';
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Early':
        return 'bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#6366F1] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40';
      case 'Late':
        return 'bg-[#FEE2E2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-300 border border-rose-200 dark:border-rose-800/40';
      case 'On Time':
        return 'bg-[#E8F8F0] dark:bg-emerald-950/40 text-[#10B981] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40';
      default:
        return '';
    }
  };

  return (
    <div
      className="w-full bg-white dark:bg-[#1e293b] rounded-none border border-gray-200 dark:border-[#334155] transition-all flex flex-col shadow-2xs"
    >
      {/* Table Header Controls */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-[#334155]"
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
              placeholder="Search"
              className="text-xs rounded-md pl-8 pr-3 py-1.5 border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-hidden focus:border-[#3D6A9E] focus:ring-1 focus:ring-[#3D6A9E] w-44 sm:w-56 shadow-2xs"
            />
          </div>

          {/* Date Picker Button */}
          <label className="relative flex items-center cursor-pointer">
            <div
              className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 border border-[#dde2e8] dark:border-[#475569] rounded-md px-3 py-1.5 bg-white dark:bg-[#0f172a] hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors shadow-2xs"
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
            className="p-1.5 rounded-md border border-[#dde2e8] dark:border-[#475569] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors shadow-2xs"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Spreadsheet Table with Leads Table Structure & Styling */}
      <div className="w-full overflow-x-auto scrollbar-slim min-h-[260px]">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs select-none">
          <thead>
            <tr className="text-gray-700 dark:text-gray-300" style={{ backgroundColor: "var(--orange-havy-light)" }}>
              {/* Frozen Checkbox Column */}
              <th
                scope="col"
                className="w-10 min-w-[40px] max-w-[40px] px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <input
                  type="checkbox"
                  aria-label="Select all"
                  className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                />
              </th>

              {/* Employee Name */}
              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Employee</span>
                  <span className="text-[10px] text-gray-400">⇅</span>
                </div>
              </th>

              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                Attendance
              </th>

              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                Status
              </th>

              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                Clock In &amp; Out
              </th>

              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                Location
              </th>

              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-r border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                Geo Location
              </th>

              <th
                scope="col"
                className="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300 border-b border-[#dde2e8] dark:border-[#334155] whitespace-nowrap"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                Distance
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  Loading attendance records...
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-xs text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
                  No attendance records found for this date.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => {
                const badgeClass = getBadgeClass(r.attendanceBadge);
                const statusBadge = getStatusBadgeClass(r.status);
                const isLate = r.status === 'Late';
                const inTimeColor = isLate ? '#ef4444' : '#f97316';

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-[#F6F4F2] dark:hover:bg-[#162032] transition-colors"
                  >
                    {/* Checkbox Cell */}
                    <td className="w-10 px-3 py-2.5 text-center border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.employee?.name}`}
                        className="w-4 h-4 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                      />
                    </td>

                    {/* Employee Avatar + Name */}
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <div className="flex items-center gap-2.5 text-left truncate">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: '#3D6A9E' }}
                        >
                          {r.employee?.initials || 'U'}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {r.employee?.name}
                        </span>
                      </div>
                    </td>

                    {/* Attendance Badge */}
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border inline-block ${badgeClass}`}
                      >
                        {r.attendanceBadge || '-'}
                      </span>
                    </td>

                    {/* Status (Early / Late / On Time / -) */}
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {statusBadge ? (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium inline-block ${statusBadge}`}>
                          {r.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">
                          {r.status || '-'}
                        </span>
                      )}
                    </td>

                    {/* Clock In & Out */}
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <div className="flex items-center text-xs font-medium" style={{ gap: '10px' }}>
                        <span style={{ color: inTimeColor }}>
                          {r.clockInAndOut?.inTime || '00:00'}
                        </span>
                        <span className="text-gray-400">
                          {r.clockInAndOut?.totalHours || '00h:00m'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {r.clockInAndOut?.outTime || '00:00'}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF0F6] dark:bg-[#1E3A5F]/50 text-[#3D6A9E] dark:text-[#93c5fd] border border-[#3D6A9E]/30 inline-block shadow-2xs"
                      >
                        {r.location || '-'}
                      </span>
                    </td>

                    {/* Geo Location with MapPin */}
                    <td className="py-2.5 px-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      {r.geoLocation ? (
                        <span className="flex items-center gap-1.5 text-xs text-[#3D6A9E] dark:text-blue-400 hover:underline cursor-pointer">
                          <MapPin size={13} className="text-[#3D6A9E] shrink-0" />
                          <span className="max-w-[200px] truncate">{r.geoLocation}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>

                    {/* Distance */}
                    <td className="py-2.5 px-3.5 border-b border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400">
                      {r.distanceRadius || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Styled Identically to Leads Table */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#1e293b] border-t border-[#dde2e8] dark:border-[#334155] text-xs text-gray-600 dark:text-gray-400">
        <div>
          Showing {totalCount === 0 ? '0-0 of 0' : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, totalCount)} of ${totalCount}`}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">15 ▾</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#162032] transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
