import { financialApi, FinancialReportResponse, FinancialReportTaskRow } from './financialApi';
import { API_BASE_URL } from './apiClient';

export type ProfitabilityTaskRow = FinancialReportTaskRow;
export type ProfitabilityReportResponse = FinancialReportResponse;

export const profitabilityReportApi = {
  async getRows(from: string, to: string, signal?: AbortSignal): Promise<ProfitabilityReportResponse> {
    return financialApi.getReport(from, to, signal);
  },

  async downloadPdf(params: {
    from: string;
    to: string;
    clientId?: string;
    view?: 'list' | 'client' | 'employee';
    search?: string;
    clientName?: string;
  }): Promise<void> {
    const { blob, filename } = await this.fetchPdfBlob(params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async fetchPdfBlob(params: {
    from: string;
    to: string;
    clientId?: string;
    view?: 'list' | 'client' | 'employee';
    search?: string;
    clientName?: string;
  }): Promise<{ blob: Blob; filename: string }> {
    const query = new URLSearchParams({ from: params.from, to: params.to });
    if (params.clientId) query.set('clientId', params.clientId);
    if (params.view) query.set('view', params.view);
    if (params.search) query.set('search', params.search);

    const authHeaders: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('turia_current_user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u.id) authHeaders['X-User-Id'] = u.id;
          if (u.role) authHeaders['X-User-Role'] = u.role;
          if (u.orgId || u.organization) authHeaders['X-Org-Id'] = u.orgId || u.organization;
          if (u.token) authHeaders['Authorization'] = `Bearer ${u.token}`;
        }
      } catch {}
    }

    const res = await fetch(`${API_BASE_URL}/financials/report/pdf?${query.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...authHeaders,
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Failed to download PDF');
      throw new Error(`Download failed (${res.status}): ${errorText}`);
    }

    const blob = await res.blob();
    const safeClient = (params.clientName || params.clientId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultFilename = safeClient
      ? `client-profitability-report-${safeClient}-${params.from}-to-${params.to}.pdf`
      : `profitability-report-${params.from}-to-${params.to}.pdf`;

    const disposition = res.headers.get('content-disposition');
    let filename = defaultFilename;
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    return { blob, filename };
  },
};
