import { request } from './apiClient';

export interface InvoicingMetricItem {
  count: number;
  amount?: number;
  label: string;
  description: string;
  link: string;
}

export interface InvoicingSummaryResponse {
  unbilledTasks: InvoicingMetricItem;
  pendingRetainers: InvoicingMetricItem;
  overdueInvoices: InvoicingMetricItem;
  draftInvoices: InvoicingMetricItem;
  totalReceivables: InvoicingMetricItem;
}

export interface TaskGroupItem {
  name: string;
  count: number;
  percentage: number;
}

export interface CompactTaskSummaryResponse {
  dueStats: {
    dueToday: number;
    dueTomorrow: number;
    dueIn7Days: number;
    overdue: number;
  };
  statusSummary: {
    pending: number;
    hold: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  groups: {
    pending: TaskGroupItem[];
    hold: TaskGroupItem[];
    inProgress: TaskGroupItem[];
    completed: TaskGroupItem[];
  };
}

export const dashboardSummaryApi = {
  getInvoicingSummary: async (): Promise<InvoicingSummaryResponse> => {
    const res = await request<InvoicingSummaryResponse>('/financials/invoicing-summary', {
      method: 'GET',
    });
    if (!res.data) throw new Error(res.message || 'Failed to fetch invoicing summary');
    return res.data;
  },

  getCompactTaskSummary: async (): Promise<CompactTaskSummaryResponse> => {
    const res = await request<CompactTaskSummaryResponse>('/tasks/compact-summary', {
      method: 'GET',
    });
    if (!res.data) throw new Error(res.message || 'Failed to fetch compact task summary');
    return res.data;
  },
};
