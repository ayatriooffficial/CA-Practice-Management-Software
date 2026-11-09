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
import { EmployeePersonalLeavesTable } from './EmployeePersonalLeavesTable';
import { teamStore } from '../team/teamStore';
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
import { pageStateCache } from '@/services/pageStateCache';
import { homeMetricsSnapshotApi } from '@/services/homeMetricsSnapshotApi';
import { preloadHomeDashboardData } from '@/services/homePreloadService';

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

  // Cached local snapshot for zero-flicker instant render on revisit
  const cachedHome = useMemo(() => pageStateCache.get('home_dashboard_data'), []);
  const cachedSummaryCards = useMemo(() => pageStateCache.get<SummaryCardData[]>('home_attendance_summary'), []);
  const cachedTodayRows = useMemo(() => pageStateCache.get<TodayAttendanceRow[]>('home_attendance_today_rows'), []);
  const cachedEmployeeRecords = useMemo(() => pageStateCache.get<MonthlyRecordItem[]>('home_attendance_employee_records'), []);
  const cachedNumericalSnapshot = useMemo(() => homeMetricsSnapshotApi.getCachedSnapshot(), []);

  // Summary state
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [summaryCards, setSummaryCards] = useState<SummaryCardData[]>(() => {
    if (cachedNumericalSnapshot?.summaryCards && cachedNumericalSnapshot.summaryCards.length > 0) {
      return cachedNumericalSnapshot.summaryCards;
    }
    return cachedSummaryCards?.length ? cachedSummaryCards : cachedHome?.summaryCards || [];
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(
    !cachedHome && !cachedSummaryCards?.length && !cachedNumericalSnapshot?.summaryCards?.length
  );

  // Check if Count Panel metrics and summary cards are already in cache
  const cachedStripLeads = useMemo(() => {
    const snap = homeMetricsSnapshotApi.getCachedSnapshot();
    const cache = pageStateCache.get<any>('home_task_strip_data');
    return cache?.leads || snap?.stripMetrics?.leads || snap?.countLabels?.leads;
  }, []);

  const isAlreadyLoaded = pageStateCache.isLoaded('/');

  const hasInitialData = Boolean(
    isAlreadyLoaded ||
    (summaryCards && summaryCards.length > 0 && cachedStripLeads)
  );
  const [isHomeReady, setIsHomeReady] = useState(() => hasInitialData);

  // Parallel preloader & fast numerical snapshot retrieval from backend
  useEffect(() => {
    if (pageStateCache.isLoaded('/')) {
      setIsHomeReady(true);
      return;
    }

    if (!isHomeReady) {
      preloadHomeDashboardData().then(() => {
        const snap = homeMetricsSnapshotApi.getCachedSnapshot();
        if (snap?.summaryCards && snap.summaryCards.length > 0) {
          setSummaryCards(snap.summaryCards);
        }
        setIsHomeReady(true);
        navigationProgress.setLoading('home_dashboard', false);
        pageStateCache.markLoaded('/');
        navigationProgress.done();
      }).catch(() => {
        setIsHomeReady(true);
        navigationProgress.setLoading('home_dashboard', false);
        pageStateCache.markLoaded('/');
        navigationProgress.done();
      });
    } else {
      homeMetricsSnapshotApi.getMetricsSnapshot().then((snapshot) => {
        if (snapshot?.summaryCards && snapshot.summaryCards.length > 0) {
          setSummaryCards((prev) => (prev.length === 0 ? snapshot.summaryCards! : prev));
        }
      }).catch(() => {});
    }
  }, [isHomeReady]);

  // UI reveal coordinator: never reveal Home UI until snapshot and count panel data are ready
  useEffect(() => {
    if (isHomeReady) {
      navigationProgress.setLoading('home_dashboard', false);
      pageStateCache.markLoaded('/');
      return;
    }

    navigationProgress.setLoading('home_dashboard', true);

    // Failsafe timer (max 600ms) to guarantee smooth reveal even on slow networks
    const timer = setTimeout(() => {
      setIsHomeReady(true);
      navigationProgress.setLoading('home_dashboard', false);
      pageStateCache.markLoaded('/');
      navigationProgress.done();
    }, 600);

    return () => clearTimeout(timer);
  }, [isHomeReady]);

  // Automatically persist latest numerical snapshot when window closes or tab is hidden
  useEffect(() => {
    const handleCloseOrHide = () => {
      if (summaryCards.length > 0) {
        const snap = homeMetricsSnapshotApi.getCachedSnapshot() || {};
        snap.summaryCards = summaryCards;
        homeMetricsSnapshotApi.saveMetricsSnapshot(snap, true);
      }
    };

    window.addEventListener('beforeunload', handleCloseOrHide);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleCloseOrHide();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleCloseOrHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [summaryCards]);

  // Today Attendance (Admin) state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });
  const [todayRows, setTodayRows] = useState<TodayAttendanceRow[]>(() => {
    return cachedTodayRows?.length ? cachedTodayRows : cachedHome?.todayRows || [];
  });
  const [isTodayLoading, setIsTodayLoading] = useState(false);

  // Attendance Details (Employee) state: previous 5 days + today
  const [employeeRecords, setEmployeeRecords] = useState<MonthlyRecordItem[]>(() => {
    return cachedEmployeeRecords?.length ? cachedEmployeeRecords : cachedHome?.employeeRecords || [];
  });
  const [isEmployeeRecordsLoading, setIsEmployeeRecordsLoading] = useState(false);

  // Bottom tables state
  const [holidays, setHolidays] = useState<UpcomingHolidayItem[]>(() => cachedHome?.holidays || []);
  const [leaves, setLeaves] = useState<UpcomingLeaveItem[]>(() => cachedHome?.leaves || []);
  const [isBottomLoading, setIsBottomLoading] = useState(!cachedHome);

  // 1. Fetch Summary Cards
  const fetchSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const res = await attendanceApi.getSummary(period);
      if (res.cards && res.cards.length > 0) {
        setSummaryCards(res.cards);
        pageStateCache.set('home_attendance_summary', res.cards);
        const snap = homeMetricsSnapshotApi.getCachedSnapshot() || {};
        snap.summaryCards = res.cards;
        homeMetricsSnapshotApi.saveMetricsSnapshot(snap, false);
      }
    } catch {
      // Retain previous cards from cache
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
        if (res.rows) {
          setTodayRows(res.rows);
          pageStateCache.set('home_attendance_today_rows', res.rows);
        }
      } catch {
        // Retain previous rows instead of blanking out
      } finally {
        setIsTodayLoading(false);
      }
    } else {
      try {
        setIsEmployeeRecordsLoading(true);
        const res = await attendanceApi.getMonthlyAttendance();
        if (res.records) {
          setEmployeeRecords(res.records);
          pageStateCache.set('home_attendance_employee_records', res.records);
        }
      } catch {
        // Retain previous records instead of blanking out
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
      let leavesPromise: Promise<any[]>;

      if (isAdmin) {
        leavesPromise = attendanceApi.getUpcomingLeaves();
      } else {
        leavesPromise = (async () => {
          try {
            const remote = await attendanceApi.getAllLeaves();
            const local = teamStore.getLeaveApplications();
            const combined = [...remote, ...local];
            const userName = (currentUser?.name || '').toLowerCase().trim();
            const userId = String(currentUser?.id || '').trim();

            const myLeaves = combined.filter((l) => {
              const applicant = String(l.applicant || '').toLowerCase().trim();
              const empId = String(l.employeeId || l.userId || '').trim();
              return (
                (userName && (applicant === userName || applicant.includes(userName) || userName.includes(applicant))) ||
                (userId && empId === userId)
              );
            });

            // Deduplicate by id / date + reason
            const map = new Map<string, any>();
            for (const item of myLeaves) {
              const key = item.id || `${item.dateOfLeave || item.date}_${item.leaveType}`;
              if (!map.has(key)) map.set(key, item);
            }
            return Array.from(map.values());
          } catch {
            return [];
          }
        })();
      }

      const [holidaysRes, leavesRes] = await Promise.all([holidaysPromise, leavesPromise]);
      setHolidays(holidaysRes);
      setLeaves(leavesRes);
    } catch {
      // Retain previous
    } finally {
      setIsBottomLoading(false);
    }
  }, [isAdmin, currentUser]);

  // Only fetch on first load in this session; do not re-fetch on revisit
  useEffect(() => {
    if (!pageStateCache.isLoaded('/')) {
      Promise.allSettled([
        fetchSummary(),
        fetchTableData(),
        fetchBottomData(),
      ]);
    }
  }, [fetchSummary, fetchTableData, fetchBottomData]);

  // Save state to local cache whenever data loads
  useEffect(() => {
    if (!isSummaryLoading && !isBottomLoading) {
      pageStateCache.set('home_dashboard_data', {
        summaryCards,
        todayRows,
        employeeRecords,
        holidays,
        leaves,
      });
      pageStateCache.markLoaded('/');
    }
  }, [isSummaryLoading, isBottomLoading, summaryCards, todayRows, employeeRecords, holidays, leaves]);

  // Ensure global progress bar stays trickling on first load only; skip if already cached
  const isDashboardLoading = useAppSelector(selectDashboardLoading);
  const isAnyHomeLoading =
    isSummaryLoading ||
    isBottomLoading ||
    isTodayLoading ||
    isEmployeeRecordsLoading ||
    isDashboardLoading;

  useEffect(() => {
    if (!pageStateCache.isLoaded('/') && !isHomeReady) {
      navigationProgress.setLoading('home_dashboard', isAnyHomeLoading);
    }
    return () => {
      navigationProgress.setLoading('home_dashboard', false);
    };
  }, [isAnyHomeLoading, isHomeReady]);

  // Punch Action Callback: Refresh summary & tables immediately
  const handlePunchChange = useCallback(() => {
    fetchSummary();
    fetchTableData();
  }, [fetchSummary, fetchTableData]);

  return (
    <div
      className={`w-full flex flex-col min-h-screen bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6 gap-3 sm:gap-4 transition-opacity duration-200 ${
        isHomeReady ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
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

      {/* Row: Side-by-side Tables: Upcoming Holidays and Upcoming Leaves (Admin: All Staff, Employee: Personal Leaves) */}
      <div
        className="w-full grid grid-cols-1 lg:grid-cols-2"
        style={{ gap: '20px' }}
      >
        <UpcomingHolidaysTable
          holidays={holidays}
          isLoading={isBottomLoading}
        />

        {isAdmin ? (
          <UpcomingLeavesTable
            leaves={leaves}
            isLoading={isBottomLoading}
          />
        ) : (
          <EmployeePersonalLeavesTable
            leaves={leaves}
            isLoading={isBottomLoading}
          />
        )}
      </div>
    </div>
  );
};
