import { call, put, select, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import {
  dashboardSlice,
  DashboardState,
} from './dashboardSlice';
import { selectDashboardState, selectIsDashboardStale } from './dashboardSelectors';
import { dashboardSummaryApi } from '@/services/dashboardSummaryApi';
import { clientApi } from '@/services/clientApi';
import { leadApi } from '@/services/leadApi';
import { attendanceApi } from '@/services/attendanceApi';

function* handleFetchDashboard(
  action: PayloadAction<{ force?: boolean; period?: 'month' | 'year'; selectedDate?: string } | undefined>
): Generator<any, void, any> {
  try {
    const isStale: boolean = yield select(selectIsDashboardStale);
    const force = action.payload?.force;

    // Cache hit: If data is fresh and no forced refresh requested, skip API calls
    if (!isStale && !force) {
      return;
    }

    const period = action.payload?.period || 'month';
    const selectedDate = action.payload?.selectedDate;

    // Parallel loading across widgets via yield all
    const [
      taskSummary,
      invoicingSummary,
      complianceSummary,
      clientStatsRes,
      leadStatsRes,
      attendanceSummaryRes,
      upcomingHolidaysRes,
    ] = yield all([
      call([dashboardSummaryApi, dashboardSummaryApi.getCompactTaskSummary]),
      call([dashboardSummaryApi, dashboardSummaryApi.getInvoicingSummary]),
      call([dashboardSummaryApi, dashboardSummaryApi.getComplianceSummary]),
      call([clientApi, clientApi.getClientStats]),
      call([leadApi, leadApi.getLeadStats]),
      call([attendanceApi, attendanceApi.getSummary], period),
      call([attendanceApi, attendanceApi.getUpcomingHolidays]),
    ]);

    let todayAttendanceRes: any = [];
    if (selectedDate) {
      try {
        const todayData: any = yield call([attendanceApi, attendanceApi.getTodayAttendance], selectedDate);
        todayAttendanceRes = todayData?.rows || [];
      } catch {
        todayAttendanceRes = [];
      }
    }

    yield put(
      dashboardSlice.actions.fetchDashboardSuccess({
        taskSummary,
        invoicingSummary,
        complianceSummary,
        clientStats: clientStatsRes?.data || null,
        leadStats: leadStatsRes?.data || null,
        attendanceSummary: attendanceSummaryRes?.cards || [],
        todayAttendance: todayAttendanceRes,
        upcomingHolidays: upcomingHolidaysRes || [],
      })
    );
  } catch (err: any) {
    yield put(
      dashboardSlice.actions.fetchDashboardFailure(
        err?.message || 'Failed to fetch dashboard data'
      )
    );
  }
}

export function* dashboardSaga() {
  yield takeLatest(dashboardSlice.actions.fetchDashboardRequest.type, handleFetchDashboard);
}

