import { request } from './apiClient';

export interface TaskAllocationInput {
  taskId: string;
  amountPaise: number;
  creditedPaise?: number;
}

export interface FinancialInvoiceInput {
  kind: 'invoice' | 'credit_note';
  state: 'draft' | 'issued';
  number: string;
  issueDate?: string | null;
  originalInvoiceId?: string | null;
  allocations: TaskAllocationInput[];
  details: Record<string, unknown>;
  idempotencyKey: string;
}

export interface FinancialReportTaskRow {
  taskId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  assigneeName: string;
  reportDate: string;
  revenue: number | null;
  manpowerCost: number | null;
  expense: number | null;
  profit: number | null;
  completeness: { revenue: boolean; manpowerCost: boolean; expense: boolean };
  employeeCosts: Array<{ employeeId: string; employeeName: string; manpowerCost: number; taskCount: number }>;
}

export interface FinancialReportResponse {
  rows: FinancialReportTaskRow[];
  employeeRows: Array<{ employeeId: string; employeeName: string; taskCount: number; manpowerCost: number }>;
  financialDataAvailable: boolean;
  historicalDataIncomplete: boolean;
}

export interface FinancialInvoiceRecord {
  _id: string;
  kind: 'invoice' | 'credit_note';
  state: 'draft' | 'issued' | 'void';
  number: string;
  issueDate: string | null;
  originalInvoiceId?: string | null;
  allocations: TaskAllocationInput[];
  details: Record<string, unknown>;
}

export interface FinancialExpenseRecord {
  _id: string;
  taskId: string;
  particulars: string;
  incurredDate: string;
  amountPaise: number;
  state: 'pending' | 'approved' | 'rejected' | 'cancelled';
  employeeId: string | { _id: string; name?: string };
  employeeName?: string;
}

export const financialApi = {
  async getReport(from: string, to: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ from, to });
    const response = await request<FinancialReportResponse>(`/financials/report?${params}`, { signal });
    if (!response.data) throw new Error('Financial report response was empty.');
    return response.data;
  },
  async listInvoices() {
    const response = await request<FinancialInvoiceRecord[]>('/financials/invoices');
    return response.data || [];
  },
  async createInvoice(input: FinancialInvoiceInput) {
    const response = await request<FinancialInvoiceRecord>('/financials/invoices', {
      method: 'POST', body: JSON.stringify(input),
    });
    if (!response.data) throw new Error('The invoice could not be saved.');
    return response.data;
  },
  async updateInvoice(id: string, updates: { details?: Record<string, unknown>; number?: string; issueDate?: string | null; allocations?: TaskAllocationInput[] }) {
    const response = await request<FinancialInvoiceRecord>(`/financials/invoices/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(updates),
    });
    if (!response.data) throw new Error('The invoice could not be updated.');
    return response.data;
  },
  async convertProforma(id: string, newNumber?: string) {
    const response = await request<FinancialInvoiceRecord>(`/financials/invoices/${encodeURIComponent(id)}/convert`, {
      method: 'POST', body: JSON.stringify({ newNumber }),
    });
    if (!response.data) throw new Error('The proforma invoice could not be converted.');
    return response.data;
  },
  async voidInvoice(id: string, reason: string) {
    const response = await request<FinancialInvoiceRecord>(`/financials/invoices/${encodeURIComponent(id)}/void`, {
      method: 'PATCH', body: JSON.stringify({ reason }),
    });
    if (!response.data) throw new Error('The invoice could not be voided.');
    return response.data;
  },
  async listReceipts() {
    const response = await request<any[]>('/financials/receipts');
    return response.data || [];
  },
  async createReceipt(payload: any) {
    const response = await request<{ receipt: any; linkedInvoice: any }>('/financials/receipts', {
      method: 'POST', body: JSON.stringify(payload),
    });
    if (!response.data) throw new Error('The payment receipt could not be recorded.');
    return response.data;
  },
  async listExpenses() {
    const response = await request<FinancialExpenseRecord[]>('/financials/expenses');
    return response.data || [];
  },
  async createExpense(input: {
    taskId: string; particulars: string; incurredDate: string; amountPaise: number; idempotencyKey: string;
  }) {
    const response = await request<FinancialExpenseRecord>('/financials/expenses', {
      method: 'POST', body: JSON.stringify(input),
    });
    if (!response.data) throw new Error('The expense could not be submitted.');
    return response.data;
  },
  async setExpenseState(id: string, state: 'approved' | 'rejected' | 'cancelled') {
    const response = await request<FinancialExpenseRecord>(`/financials/expenses/${encodeURIComponent(id)}/state`, {
      method: 'PATCH', body: JSON.stringify({ state }),
    });
    if (!response.data) throw new Error('The expense status could not be updated.');
    return response.data;
  },
  async setInternalCostRate(employeeId: string, rate: number | null) {
    const response = await request(`/financials/employees/${encodeURIComponent(employeeId)}/internal-cost-rate`, {
      method: 'PUT', body: JSON.stringify({ internalCostRatePaisePerHour: rate === null ? null : Math.round(rate * 100) }),
    });
    if (!response.data) throw new Error('The internal cost rate could not be saved.');
  },
  async listInternalCostRates(): Promise<Array<{ id: string; name: string; ratePaisePerHour: number | null }>> {
    const response = await request<Array<{ _id: string; name: string; internalCostRatePaisePerHour: number | null }>>('/financials/employees/internal-cost-rates');
    return (response.data || []).map((row) => ({ id: row._id, name: row.name, ratePaisePerHour: row.internalCostRatePaisePerHour ?? null }));
  },
  async createTimeEntry(input: { taskId: string; workDate: string; durationSeconds: number; idempotencyKey: string }) {
    const response = await request('/financials/time-entries', { method: 'POST', body: JSON.stringify(input) });
    if (!response.data) throw new Error('Task time could not be saved.');
  },
};
