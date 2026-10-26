"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ProfileBanner } from './ProfileBanner';
import { HomeTabs } from './HomeTabs';
import { PunchCard } from './PunchCard';
import { NoticeBoardCard } from './NoticeBoardCard';
import { SummaryCards } from './SummaryCards';
import { TodayAttendanceTable } from './TodayAttendanceTable';
import { MonthlyAttendanceTable } from './MonthlyAttendanceTable';
import { UpcomingHolidaysTable } from './UpcomingHolidaysTable';
import { UpcomingLeavesTable } from './UpcomingLeavesTable';
import {
  attendanceApi,
  SummaryCardData,
  TodayAttendanceRow,
  MonthlyRecordItem,
  UpcomingHolidayItem,
  UpcomingLeaveItem,
} from '../../services/attendanceApi';

export const HomeDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  // Mode resolution: Admin gets admin view, all others get employee view
  const isAdmin = useMemo(() => {
    return (currentUser?.role || '').toLowerCase() === 'admin';
  }, [currentUser]);

  // Active sub-tab (Attendance is active per task scope)
  const [activeTab, setActiveTab] = useState('attendance');

  // Summary state
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [summaryCards, setSummaryCards] = useState<SummaryCardData[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Today Attendance (Admin) state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });
  const [todayRows, setTodayRows] = useState<TodayAttendanceRow[]>([]);
  const [isTodayLoading, setIsTodayLoading] = useState(false);

  // Attendance Details (Employee) state: previous 5 days + today
  const [employeeRecords, setEmployeeRecords] = useState<MonthlyRecordItem[]>([]);
  const [isEmployeeRecordsLoading, setIsEmployeeRecordsLoading] = useState(false);

  // Bottom tables state
  const [holidays, setHolidays] = useState<UpcomingHolidayItem[]>([]);
  const [leaves, setLeaves] = useState<UpcomingLeaveItem[]>([]);
  const [isBottomLoading, setIsBottomLoading] = useState(true);

  // 1. Fetch Summary Cards
  const fetchSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const res = await attendanceApi.getSummary(period);
      setSummaryCards(res.cards || []);
    } catch {
      // Retain previous
    } finally {
      setIsSummaryLoading(false);
    }
  }, [period]);

  // 2. Fetch Attendance Table Data
  const fetchTableData = useCallback(async () => {
    if (isAdmin) {
      try {
        setIsTodayLoading(true);
        const res = await attendanceApi.getTodayAttendance(selectedDate);
        setTodayRows(res.rows || []);
      } catch {
        setTodayRows([]);
      } finally {
        setIsTodayLoading(false);
      }
    } else {
      try {
        setIsEmployeeRecordsLoading(true);
        const res = await attendanceApi.getMonthlyAttendance();
        setEmployeeRecords(res.records || []);
      } catch {
        setEmployeeRecords([]);
      } finally {
        setIsEmployeeRecordsLoading(false);
      }
    }
  }, [isAdmin, selectedDate]);

  // 3. Fetch Bottom Tables (Holidays & Leaves)
  const fetchBottomData = useCallback(async () => {
    try {
      setIsBottomLoading(true);
      const holidaysPromise = attendanceApi.getUpcomingHolidays();
      const leavesPromise = isAdmin ? attendanceApi.getUpcomingLeaves() : Promise.resolve([]);

      const [holidaysRes, leavesRes] = await Promise.all([holidaysPromise, leavesPromise]);
      setHolidays(holidaysRes);
      setLeaves(leavesRes);
    } catch {
      // Retain previous
    } finally {
      setIsBottomLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  useEffect(() => {
    fetchBottomData();
  }, [fetchBottomData]);

  // Punch Action Callback: Refresh summary & tables immediately
  const handlePunchChange = useCallback(() => {
    fetchSummary();
    fetchTableData();
  }, [fetchSummary, fetchTableData]);

  return (
    <div
      className="w-full flex flex-col transition-colors min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc]"
      style={{
        padding: '24px 32px 48px 32px',
        gap: '24px',
      }}
    >
      {/* 1. Drag-handle Sub-tabs Header (Attendance, TimeSheet, Task, Sales, Notes) */}
      <HomeTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* 3. Two Top Cards: Welcome & Live Punch Card + Notice Board */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px' }}>
        <PunchCard
          userName={currentUser?.name || 'User'}
          onPunchChange={handlePunchChange}
        />
        <NoticeBoardCard isAdmin={isAdmin} />
      </div>

      {/* 4. Summary Metric Cards */}
      <SummaryCards
        cards={summaryCards}
        mode={isAdmin ? 'admin' : 'employee'}
        period={period}
        onPeriodChange={(p) => setPeriod(p)}
        isLoading={isSummaryLoading}
      />

      {/* 5. Main Attendance Table (Today's Attendance for Admin, Past 5 Days & Today for Employee) */}
      {isAdmin ? (
        <TodayAttendanceTable
          rows={todayRows}
          selectedDate={selectedDate}
          onDateChange={(d) => setSelectedDate(d)}
          isLoading={isTodayLoading}
        />
      ) : (
        <MonthlyAttendanceTable
          records={employeeRecords}
          isLoading={isEmployeeRecordsLoading}
        />
      )}

      {/* 6. Side-by-side Tables: Upcoming Holidays and Upcoming Leaves */}
      <div
        className={`w-full grid ${
          isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
        style={{ gap: '20px' }}
      >
        <UpcomingHolidaysTable
          holidays={holidays}
          isLoading={isBottomLoading}
        />

        {isAdmin && (
          <UpcomingLeavesTable
            leaves={leaves}
            isLoading={isBottomLoading}
          />
        )}
      </div>
    </div>
  );
};
