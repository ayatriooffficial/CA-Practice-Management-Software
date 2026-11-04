import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  CompactTaskSummaryResponse,
  InvoicingSummaryResponse,
  ComplianceSummaryResponse,
} from '@/services/dashboardSummaryApi';
import { ClientStats } from '@/services/clientApi';
import { LeadStats } from '@/services/leadApi';
import {
  SummaryCardData,
  TodayAttendanceRow,
  UpcomingHolidayItem,
  UpcomingLeaveItem,
} from '@/services/attendanceApi';

export interface DashboardState {
  taskSummary: CompactTaskSummaryResponse | null;
  invoicingSummary: InvoicingSummaryResponse | null;
  complianceSummary: ComplianceSummaryResponse | null;
  clientStats: ClientStats | null;
  leadStats: LeadStats | null;
  attendanceSummary: SummaryCardData[];
  todayAttendance: TodayAttendanceRow[];
  upcomingHolidays: UpcomingHolidayItem[];
  upcomingLeaves: UpcomingLeaveItem[];
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DashboardState = {
  taskSummary: null,
  invoicingSummary: null,
  complianceSummary: null,
  clientStats: null,
  leadStats: null,
  attendanceSummary: [],
  todayAttendance: [],
  upcomingHolidays: [],
  upcomingLeaves: [],
  loading: false,
  isRefreshing: false,
  error: null,
  lastFetched: null,
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchDashboardRequest: (
      state,
      action: PayloadAction<{ force?: boolean } | undefined>
    ) => {
      if (action.payload?.force) {
        state.isRefreshing = true;
      } else if (!state.lastFetched) {
        state.loading = true;
      }
      state.error = null;
    },
    fetchDashboardSuccess: (
      state,
      action: PayloadAction<{
        taskSummary?: CompactTaskSummaryResponse | null;
        invoicingSummary?: InvoicingSummaryResponse | null;
        complianceSummary?: ComplianceSummaryResponse | null;
        clientStats?: ClientStats | null;
        leadStats?: LeadStats | null;
        attendanceSummary?: SummaryCardData[];
        todayAttendance?: TodayAttendanceRow[];
        upcomingHolidays?: UpcomingHolidayItem[];
        upcomingLeaves?: UpcomingLeaveItem[];
      }>
    ) => {
      if (action.payload.taskSummary !== undefined) state.taskSummary = action.payload.taskSummary;
      if (action.payload.invoicingSummary !== undefined) state.invoicingSummary = action.payload.invoicingSummary;
      if (action.payload.complianceSummary !== undefined) state.complianceSummary = action.payload.complianceSummary;
      if (action.payload.clientStats !== undefined) state.clientStats = action.payload.clientStats;
      if (action.payload.leadStats !== undefined) state.leadStats = action.payload.leadStats;
      if (action.payload.attendanceSummary !== undefined) state.attendanceSummary = action.payload.attendanceSummary;
      if (action.payload.todayAttendance !== undefined) state.todayAttendance = action.payload.todayAttendance;
      if (action.payload.upcomingHolidays !== undefined) state.upcomingHolidays = action.payload.upcomingHolidays;
      if (action.payload.upcomingLeaves !== undefined) state.upcomingLeaves = action.payload.upcomingLeaves;

      state.loading = false;
      state.isRefreshing = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    fetchDashboardFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.isRefreshing = false;
      state.error = action.payload;
    },
    invalidateDashboard: (state) => {
      state.lastFetched = null;
    },
  },
});

export const {
  fetchDashboardRequest,
  fetchDashboardSuccess,
  fetchDashboardFailure,
  invalidateDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

