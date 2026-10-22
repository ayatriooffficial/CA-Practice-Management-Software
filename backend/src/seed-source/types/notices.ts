export type Portal = 'GST' | 'IT' | 'TDS';

export type NoticeStatus =
  | 'new'
  | 'response_preparing'
  | 'response_filed'
  | 'under_dept_review'
  | 'hearing_scheduled'
  | 'appeal_filed'
  | 'closed'
  | 'no_status';

export interface FileRef {
  id: string;
  name: string;
  url: string;
  mime: string;
}

export interface Client {
  id: string;
  name: string;
  identifiers: {
    gstin?: string;
    tan?: string;
    pan?: string;
  };
  state?: string;
  portals: Portal[];
  sync: {
    status: 'ready' | 'error' | 'stale' | 'never_synced';
    errorMessage?: string;
    lastSyncAt?: string;
  };
}

export interface NoticeBase {
  id: string;
  clientId: string;
  portal: Portal;
  noticeNumber: string;
  description?: string;
  files: FileRef[];
  syncedAt: string;
}

export interface GstNotice extends NoticeBase {
  portal: 'GST';
  type: 'Notice' | 'Appeal' | 'Order';
  noticeDate: string;
  dueDate?: string | null;
  status: NoticeStatus;
  taskId?: string | null;
}

export interface TdsNotice extends NoticeBase {
  portal: 'TDS';
  category: string;
  period: string;
  formType: string;
  noticeDate: string;
  portalStatus: string;
  manualStatus: NoticeStatus;
  dueDate?: string | null;
}

export interface ItNotice extends NoticeBase {
  portal: 'IT';
  category: string;
  periodAY: string;
  issuedOn: string;
  portalStatus: string;
  manualStatus: NoticeStatus;
  dueDate?: string | null;
}

export type Notice = GstNotice | TdsNotice | ItNotice;

export interface SyncJob {
  id: string;
  startedAt: string;
  finishedAt?: string;
  triggeredBy: string;
  module: 'notices' | 'compliance';
  portals: Portal[];
  clientIds: string[];
  status: 'running' | 'success' | 'partial' | 'failed';
  creditsUsed: number;
  newItems: number;
  results: {
    clientId: string;
    portal: Portal;
    ok: boolean;
    found: number;
    error?: string;
  }[];
}

export interface ActivityLog {
  id: string;
  at: string;
  userId: string;
  clientId: string;
  noticeId?: string;
  action: 'status_changed' | 'task_created' | 'file_downloaded' | 'note_added';
  from?: string;
  to?: string;
}

export interface ClientCounts {
  all: number;
  notices: number;
  issues: number;
  gst: number;
  it: number;
  tds: number;
}

export interface GetClientsParams {
  search?: string;
  filter?: 'all' | 'notices' | 'issues';
  portal?: Portal | 'ALL';
  sort?: string;
}

export interface GetClientsResponse {
  data: Client[];
  counts: ClientCounts;
}

export type NoticeSummary = Record<NoticeStatus, number> & { total: number };

export interface GetNoticesParams {
  portal?: Portal | 'ALL';
  search?: string;
  status?: NoticeStatus | 'ALL';
  groupBy?: 'client' | 'none';
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface GetNoticesResponse {
  data: Notice[];
  summary: NoticeSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  portal: Portal;
  clientId: string;
  clientName: string;
  noticeId: string;
  status: NoticeStatus;
  complianceStatus?: 'FILED' | 'MISSED' | 'PENDING' | 'BLANK';
  type: 'notice_date' | 'due_date';
}

export interface GetCalendarEventsParams {
  month?: string;
  portal?: Portal | 'ALL';
  status?: NoticeStatus | 'ALL';
  by?: 'notice_date' | 'due_date';
  module?: 'notices' | 'compliance';
}

export interface SyncClientsParams {
  clientIds: string[];
  portals: Portal[];
  module?: 'notices' | 'compliance';
}
