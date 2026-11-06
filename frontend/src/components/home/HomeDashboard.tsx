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
import { AdminWelcomeTodoCard } from './AdminWelcomeTodoCard';
import { PendingInvoicingCard } from './PendingInvoicingCard';
import { CompactTaskCard } from './CompactTaskCard';
import { TopTaskDueStrip } from './TopTaskDueStrip';
import { ClientsCard } from './ClientsCard';
import { ComplianceCard } from './ComplianceCard';
import {
  attendanceApi,
  SummaryCardData,
  TodayAttendanceRow,
  MonthlyRecordItem,
  UpcomingHolidayItem,
  UpcomingLeaveItem,
} from '../../services/attendanceApi';
import { usePermission } from '../team/usePermission';
import { isRoleAdmin } from '@/store/permissions/roleSelectors';
import { useAppSelector } from '@/store/hooks';
import { selectDashboardLoading } from '@/store/features/dashboard/dashboardSelectors';
import { navigationProgress } from '@/services/navigationProgress';

export const HomeDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { canView, isAdmin: isPermAdmin } = usePermission();

  // Mode resolution: Admin gets admin view, all others get employee view
  const isAdmin = useMemo(() => {
    return isPermAdmin || isRoleAdmin(currentUser?.role);
  }, [currentUser]);

  // Section visibility based on role permissions
  const showLeads = isAdmin || canView('leads');
  const showTasks = isAdmin || canView('task_manager');
  const showInvoicing = isAdmin || canView('invoice');
  const showClients = isAdmin || canView('clients');
  const showCompliance = isAdmin || canView('compliance_tracker');
  const showTodo = isAdmin || canView('todo');
  const showNotice = isAdmin || canView('notice_management');

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

  // Parallel concurrent fetching (multithreading-like concurrent requests)
  useEffect(() => {
    Promise.allSettled([
      fetchSummary(),
      fetchTableData(),
      fetchBottomData(),
    ]);
  }, [fetchSummary, fetchTableData, fetchBottomData]);

  // Ensure global progress bar stays trickling and does NOT reach 100% until ALL home data has loaded
  const isDashboardLoading = useAppSelector(selectDashboardLoading);
  const isAnyHomeLoading =
    isSummaryLoading ||
    isBottomLoading ||
    isTodayLoading ||
    isEmployeeRecordsLoading ||
    isDashboardLoading;

  useEffect(() => {
    navigationProgress.setLoading('home_dashboard', isAnyHomeLoading);
    return () => {
      navigationProgress.setLoading('home_dashboard', false);
    };
  }, [isAnyHomeLoading]);

  // Punch Action Callback: Refresh summary & tables immediately
  const handlePunchChange = useCallback(() => {
    fetchSummary();
    fetchTableData();
  }, [fetchSummary, fetchTableData]);

  return (
    <div className="w-full flex flex-col transition-colors min-h-screen bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6 gap-3 sm:gap-4">
      {/* Top Banner: Metrics Strip with Category Tabs */}
      {(isAdmin || showTasks || showInvoicing || showClients || showCompliance || showLeads) && (
        <TopTaskDueStrip />
      )}

      {/* For EMPLOYEE: Punch In (40%) & Notice Board (60%) right below Count Panel */}
      {!isAdmin && (
        <div
          className="w-full grid grid-cols-1 lg:grid-cols-12 items-stretch"
          style={{ gap: '20px' }}
        >
          <div className={showNotice ? "lg:col-span-5 flex flex-col" : "lg:col-span-12 flex flex-col"}>
            <PunchCard
              userName={currentUser?.name || 'User'}
              onPunchChange={handlePunchChange}
            />
          </div>
          {showNotice && (
            <div className="lg:col-span-7 flex flex-col">
              <NoticeBoardCard isAdmin={false} />
            </div>
          )}
        </div>
      )}

      {/* Row: Task and Invoice (Appointed tasks only for employee) */}
      {(showTasks || showInvoicing) && (
        <div
          className={`w-full grid items-stretch ${
            showTasks && showInvoicing ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
          style={{ gap: '20px' }}
        >
          {showTasks && (
            <div className="flex flex-col">
              <CompactTaskCard />
            </div>
          )}
          {showInvoicing && (
            <div className="flex flex-col">
              <PendingInvoicingCard />
            </div>
          )}
        </div>
      )}

      {/* Row: Client and Compliance Elements */}
      {(showClients || showCompliance) && (
        <div
          className={`w-full grid items-stretch ${
            showClients && showCompliance ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
          style={{ gap: '20px' }}
        >
          {showClients && (
            <div className="flex flex-col">
              <ClientsCard />
            </div>
          )}
          {showCompliance && (
            <div className="flex flex-col">
              <ComplianceCard />
            </div>
          )}
        </div>
      )}

      {/* For ADMIN: To-Do (40%) + Notice Board (60%) */}
      {isAdmin && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-stretch" style={{ gap: '20px' }}>
          <div className="lg:col-span-5 flex flex-col">
            <AdminWelcomeTodoCard userName={currentUser?.name || 'Admin'} />
          </div>
          <div className="lg:col-span-7 flex flex-col">
            <NoticeBoardCard isAdmin={true} />
          </div>
        </div>
      )}

      {/* For EMPLOYEE: To-Do List (Full Width) */}
      {!isAdmin && showTodo && (
        <div className="w-full flex flex-col">
          <AdminWelcomeTodoCard userName={currentUser?.name || 'User'} />
        </div>
      )}

      {/* Row: Attendance Stat Cards (For Admin: covers non-admin staff only; For Employee: own stats) */}
      <SummaryCards
        cards={summaryCards}
        mode={isAdmin ? 'admin' : 'employee'}
        period={period}
        onPeriodChange={(p) => setPeriod(p)}
        isLoading={isSummaryLoading}
      />

      {/* Row: Main Attendance Table (Today's Attendance for Admin, Past 5 Days & Today for Employee) */}
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

      {/* Row: Side-by-side Tables: Upcoming Holidays and Upcoming Leaves */}
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
