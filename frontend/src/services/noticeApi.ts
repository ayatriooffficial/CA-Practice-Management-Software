import { request, type ApiResponse } from './apiClient';
import type {
  ActivityLog,
  CalendarEvent,
  Client,
  ClientCounts,
  GetNoticesParams,
  Notice,
  NoticeStatus,
  NoticeSummary,
  SyncJob,
} from '@/types/notices';

export interface NoticeResponse {
  data: Notice[];
  summary: NoticeSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface NoticeClient extends Client {
  totalNotices: number;
  overdueNotices: number;
}

export interface NoticeClientsResponse {
  data: NoticeClient[];
  counts: ClientCounts;
}

const emptySummary = (): NoticeSummary => ({
  total: 0,
  new: 0,
  response_preparing: 0,
  response_filed: 0,
  under_dept_review: 0,
  hearing_scheduled: 0,
  appeal_filed: 0,
  closed: 0,
  no_status: 0,
});

function normalizeNotice(value: Record<string, unknown>): Notice {
  return {
    ...value,
    id: String(value.id ?? value._id),
    clientId: String(value.clientId),
    files: Array.isArray(value.files) ? value.files : [],
  } as Notice;
}

function normalizeClient(value: Record<string, unknown>): NoticeClient {
  const sync = (value.sync ?? {}) as Record<string, unknown>;
  const customerFiles = (value.customerFiles ?? {}) as Record<string, unknown>;
  const statutory = Array.isArray(customerFiles.statutory) ? customerFiles.statutory as Record<string, unknown>[] : [];
  const identifiers = statutory.reduce<Record<string, string>>((result, item) => {
    const type = String(item.type ?? '').toLowerCase();
    const idNo = item.idNo ? String(item.idNo) : undefined;
    if (idNo && (type === 'gst' || type === 'gstin')) result.gstin = idNo;
    if (idNo && type === 'tan') result.tan = idNo;
    if (idNo && type === 'pan') result.pan = idNo;
    return result;
  }, {});
  return {
    ...value,
    id: String(value.id ?? value._id),
    identifiers: (value.identifiers ?? identifiers) as Client['identifiers'],
    portals: (value.portals ?? []) as Client['portals'],
    sync: {
      status: (sync.status ?? 'never_synced') as Client['sync']['status'],
      errorMessage: sync.errorMessage as string | undefined,
      lastSyncAt: sync.lastSyncAt as string | undefined,
    },
    totalNotices: Number(value.totalNotices ?? 0),
    overdueNotices: Number(value.overdueNotices ?? 0),
  } as NoticeClient;
}

function query(params: Record<string, string | number | undefined>) {
  const values = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return values.length ? `?${new URLSearchParams(values.map(([k, v]) => [k, String(v)]))}` : '';
}

export const noticeApi = {
  getNotices: async (params: GetNoticesParams = {}): Promise<ApiResponse<NoticeResponse>> => {
    const response = await request<Record<string, unknown>[]>('/notices' + query({
      portal: params.portal === 'ALL' ? undefined : params.portal,
      search: params.search,
      status: params.status === 'ALL' ? undefined : params.status,
      groupBy: params.groupBy,
      sortBy: params.sortBy,
      page: params.page,
      limit: params.pageSize,
    }));
    const data = (response.data ?? []).map((notice) => normalizeNotice(notice));
    const summary = (response as ApiResponse<unknown> & { summary?: NoticeSummary }).summary ?? emptySummary();
    const pagination = response.pagination;
    return {
      ...response,
      data: {
        data,
        summary: { ...emptySummary(), ...summary, total: summary.total ?? data.length },
        pagination: {
          page: pagination?.page ?? params.page ?? 1,
          pageSize: pagination?.limit ?? params.pageSize ?? 50,
          total: pagination?.totalDocs ?? data.length,
          totalPages: pagination?.totalPages ?? 1,
        },
      },
    };
  },

  getSummary: async (portal?: string): Promise<ApiResponse<NoticeSummary>> =>
    request<NoticeSummary>('/notices/summary' + query({ portal })),

  getClients: async (params: { search?: string; filter?: string; portal?: string } = {}): Promise<ApiResponse<NoticeClientsResponse>> => {
    const response = await request<{ data: Record<string, unknown>[]; counts: Partial<ClientCounts> }>('/notices/clients' + query(params));
    const counts = response.data?.counts || {};
    return {
      ...response,
      data: {
        data: (response.data?.data ?? []).map(normalizeClient),
        counts: {
          all: counts.all ?? 0,
          notices: counts.notices ?? 0,
          issues: counts.issues ?? 0,
          gst: counts.gst ?? 0,
          it: counts.it ?? 0,
          tds: counts.tds ?? 0,
        },
      },
    };
  },

  getCalendar: (params: Record<string, string | undefined> = {}): Promise<ApiResponse<CalendarEvent[]>> =>
    request<CalendarEvent[]>('/notices/calendar' + query(params)),

  updateStatus: (id: string, status: NoticeStatus): Promise<ApiResponse<Notice>> =>
    request<Notice>(`/notices/${id}`, { method: 'PATCH', body: JSON.stringify({ status, manualStatus: status }) }),

  getCredits: (): Promise<ApiResponse<{ credits: number }>> => request<{ credits: number }>('/notices/credits'),

  getSyncJobs: (params: Record<string, string | number | undefined> = {}): Promise<ApiResponse<SyncJob[]>> =>
    request<SyncJob[]>('/sync/jobs' + query(params)),

  getActivityLogs: (params: Record<string, string | number | undefined> = {}): Promise<ApiResponse<ActivityLog[]>> =>
    request<ActivityLog[]>('/sync/activity' + query(params)),
};

export const getNotices = async (params: GetNoticesParams = {}) => (await noticeApi.getNotices(params)).data;
export const getClients = async (params: { search?: string; filter?: string; portal?: string } = {}) => (await noticeApi.getClients(params)).data;
export const getCalendarEvents = async (params: Record<string, string | undefined> = {}) => (await noticeApi.getCalendar(params)).data;
export const updateNoticeStatus = async (id: string, status: NoticeStatus) => (await noticeApi.updateStatus(id, status)).data;
export const getCredits = async () => (await noticeApi.getCredits()).data;
export const getSyncJobs = async (params: Record<string, string | number | undefined> = {}) => (await noticeApi.getSyncJobs(params)).data;
export const getActivityLogs = async (params: Record<string, string | number | undefined> = {}) => (await noticeApi.getActivityLogs(params)).data;
