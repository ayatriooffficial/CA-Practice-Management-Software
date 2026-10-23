import { request } from './apiClient';

export interface SummaryCardData {
  id: string;
  title: string;
  value: string;
  badge: string;
  bar: string;
}

export interface SummaryResponse {
  mode: 'admin' | 'employee';
  period?: 'month' | 'year';
  cards: SummaryCardData[];
}

export interface LiveStatusResponse {
  serverTime: string;
  todayDate: string;
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
  punchIn: string | null;
  punchOut: string | null;
  breakMinutes: number;
  totalMinutes: number;
  status: 'On Time' | 'Late' | '-';
  shiftHours: number;
}

export interface TodayAttendanceRow {
  id: string;
  employee: {
    id: string;
    name: string;
    initials: string;
    email: string;
  };
  attendanceBadge: string;
  status: string;
  clockInAndOut: {
    inTime: string;
    totalHours: string;
    outTime: string;
  };
  location: string;
  nameOfTheLocation: string;
  geoLocation: string;
  officeLocation: string;
  distanceRadius: string;
  breakMinutes: string;
}

export interface TodayAttendanceResponse {
  date: string;
  totalEmployees: number;
  rows: TodayAttendanceRow[];
}

export interface MonthlyRecordItem {
  date: string;
  day: string;
  attendanceBadge: string;
  status: string;
  clockIn: string;
  clockOut: string;
  totalHours: string;
  location: string;
  breakMinutes: string;
  isFuture: boolean;
}

export interface MonthlyAttendanceResponse {
  month: string;
  user: {
    id: string;
    name: string;
  };
  records: MonthlyRecordItem[];
}

export interface UpcomingHolidayItem {
  id: string;
  date: string;
  holiday: string;
  day: string;
  description: string;
}

export interface UpcomingLeaveItem {
  id: string;
  date: string;
  name: string;
  leaveType: string;
  day: string;
  status: string;
  duration: string;
}

export interface OfficeNoticeItem {
  id: string;
  title: string;
  body: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

export const attendanceApi = {
  async getServerTime(): Promise<{ serverTime: string; timestampMs: number }> {
    const res = await request<{ serverTime: string; timestampMs: number }>('/attendance/time');
    return res.data || { serverTime: new Date().toISOString(), timestampMs: Date.now() };
  },

  async getLiveStatus(): Promise<LiveStatusResponse> {
    const res = await request<LiveStatusResponse>('/attendance/live');
    if (!res.data) throw new Error(res.message || 'Failed to fetch live punch status');
    return res.data;
  },

  async punchIn(geo?: { lat: number; lng: number; accuracy?: number }) {
    const res = await request<any>('/attendance/punch-in', {
      method: 'POST',
      body: JSON.stringify({ geo }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to punch in');
    return res.data;
  },

  async punchOut() {
    const res = await request<any>('/attendance/punch-out', {
      method: 'POST',
    });
    if (!res.success) throw new Error(res.message || 'Failed to punch out');
    return res.data;
  },

  async getSummary(period?: 'month' | 'year'): Promise<SummaryResponse> {
    const query = period ? `?period=${period}` : '';
    const res = await request<SummaryResponse>(`/attendance/summary${query}`);
    if (!res.data) throw new Error(res.message || 'Failed to fetch attendance summary');
    return res.data;
  },

  async getTodayAttendance(date?: string): Promise<TodayAttendanceResponse> {
    const query = date ? `?date=${date}` : '';
    const res = await request<TodayAttendanceResponse>(`/attendance/today${query}`);
    if (!res.data) throw new Error(res.message || 'Failed to fetch today attendance');
    return res.data;
  },

  async getMonthlyAttendance(month?: string): Promise<MonthlyAttendanceResponse> {
    const query = month ? `?month=${month}` : '';
    const res = await request<MonthlyAttendanceResponse>(`/attendance/me${query}`);
    if (!res.data) throw new Error(res.message || 'Failed to fetch monthly attendance');
    return res.data;
  },

  async getUpcomingHolidays(): Promise<UpcomingHolidayItem[]> {
    const res = await request<UpcomingHolidayItem[]>('/attendance/holidays/upcoming');
    return res.data || [];
  },

  async getUpcomingLeaves(): Promise<UpcomingLeaveItem[]> {
    const res = await request<UpcomingLeaveItem[]>('/attendance/leaves/upcoming');
    return res.data || [];
  },

  async getOfficeNotices(): Promise<OfficeNoticeItem[]> {
    const res = await request<OfficeNoticeItem[]>('/attendance/office-notices');
    return res.data || [];
  },

  async createOfficeNotice(title: string, body: string): Promise<OfficeNoticeItem> {
    const res = await request<OfficeNoticeItem>('/attendance/office-notices', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to create notice');
    return res.data!;
  },

  async deleteOfficeNotice(id: string): Promise<boolean> {
    const res = await request<{ deleted: boolean }>(`/attendance/office-notices/${id}`, {
      method: 'DELETE',
    });
    return !!res.success;
  },
};
