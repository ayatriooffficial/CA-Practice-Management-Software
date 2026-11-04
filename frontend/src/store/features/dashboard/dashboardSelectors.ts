import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store/rootReducer';
import { DashboardState } from './dashboardSlice';

export const selectDashboardState = (state: RootState): DashboardState => state.dashboard;

export const selectDashboardTaskSummary = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.taskSummary
);

export const selectDashboardInvoicingSummary = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.invoicingSummary
);

export const selectDashboardComplianceSummary = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.complianceSummary
);

export const selectDashboardClientStats = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.clientStats
);

export const selectDashboardLeadStats = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.leadStats
);

export const selectDashboardAttendanceSummary = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.attendanceSummary
);

export const selectDashboardTodayAttendance = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.todayAttendance
);

export const selectDashboardUpcomingHolidays = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.upcomingHolidays
);

export const selectDashboardUpcomingLeaves = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.upcomingLeaves
);

export const selectDashboardLoading = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.loading
);

export const selectDashboardRefreshing = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.isRefreshing
);

export const selectDashboardLastFetched = createSelector(
  [selectDashboardState],
  (dashboard) => dashboard.lastFetched
);

// 5-minute TTL helper selector
export const selectIsDashboardStale = createSelector(
  [selectDashboardLastFetched],
  (lastFetched) => {
    if (!lastFetched) return true;
    const TTL_MS = 5 * 60 * 1000; // 5 minutes
    return Date.now() - lastFetched > TTL_MS;
  }
);

