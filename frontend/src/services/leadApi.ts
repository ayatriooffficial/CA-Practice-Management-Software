import { request, ApiResponse } from './apiClient';
import { Lead } from '@/data/crmData';

export interface LeadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  state?: string;
  gender?: string;
  includeDeleted?: boolean;
}

export interface LeadStats {
  totalLeads: number;
  totalDeleted: number;
  byStatus: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    dropped: number;
  };
  conversionRate: number;
}

export interface ConvertLeadPayload {
  type: string;
  group: string;
  fileNo?: string;
  active?: boolean;
  services?: string[];
  users?: string[];
}

export const leadApi = {
  getLeads: async (params: LeadQueryParams = {}): Promise<ApiResponse<Lead[]>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.status) searchParams.set('status', params.status);
    if (params.state) searchParams.set('state', params.state);
    if (params.gender) searchParams.set('gender', params.gender);
    if (params.includeDeleted) searchParams.set('includeDeleted', 'true');

    const query = searchParams.toString();
    return request<Lead[]>(`/leads${query ? `?${query}` : ''}`);
  },

  getLeadStats: async (): Promise<ApiResponse<LeadStats>> => {
    return request<LeadStats>('/leads/stats');
  },

  getLeadById: async (id: string, includeDeleted = false): Promise<ApiResponse<Lead>> => {
    return request<Lead>(`/leads/${id}${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  createLead: async (payload: Partial<Lead>): Promise<ApiResponse<Lead>> => {
    return request<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateLead: async (id: string, payload: Partial<Lead>): Promise<ApiResponse<Lead>> => {
    return request<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  softDeleteLead: async (id: string): Promise<ApiResponse<Lead>> => {
    return request<Lead>(`/leads/${id}`, {
      method: 'DELETE',
    });
  },

  restoreLead: async (id: string): Promise<ApiResponse<Lead>> => {
    return request<Lead>(`/leads/${id}/restore`, {
      method: 'PATCH',
    });
  },

  permanentDeleteLead: async (id: string): Promise<ApiResponse<null>> => {
    return request<null>(`/leads/${id}/permanent`, {
      method: 'DELETE',
    });
  },

  convertLead: async (
    id: string,
    payload: ConvertLeadPayload
  ): Promise<ApiResponse<{ lead: Lead; client: any }>> => {
    try {
      const res = await request<{ lead: Lead; client: any }>(`/leads/${id}/convert`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res.data) return res;
    } catch {
      // Local fallback for demo mode
    }

    // Dynamic import to avoid circular dependencies
    const { appSyncService } = await import('./appSyncService');
    const { taskApi } = await import('./taskApi');

    const leads = appSyncService.getLeads();
    const lead = leads.find((l) => l.id === id);
    if (!lead) throw new Error('Lead not found');

    const newClient: any = {
      id: `cli-${Date.now()}`,
      name: lead.fullName,
      pan: lead.pan || `AAKCA${Math.floor(1000 + Math.random() * 9000)}F`,
      type: payload.type || 'llp',
      group: payload.group || 'Accounting',
      fileNo: payload.fileNo || `FL-${Math.floor(100 + Math.random() * 900)}`,
      mobile: lead.mobile,
      email: lead.email,
      address: lead.address || 'Main Commercial Center, Mumbai',
      state: lead.state || 'Maharashtra',
      city: 'Mumbai',
      pincode: lead.pincode || '400001',
      status: 'active',
      assigneeName: 'Deepak Sahani',
      assigneeRole: 'Senior Partner',
      tags: ['Converted Lead'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save new client to CRM
    appSyncService.saveClient(newClient);

    // 2. Automatically schedule recurring tasks for selected services
    if (payload.services && payload.services.length > 0) {
      payload.services.forEach((srvKey) => {
        const srvName =
          srvKey === 'gst-monthly'
            ? 'GST Return Filing - Monthly'
            : srvKey === 'it-advance-tax'
            ? 'Advance Tax Calculation & Payment'
            : 'Statutory Compliance';

        taskApi.createTask({
          clientName: newClient.name,
          clientId: newClient.id,
          clientPan: newClient.pan,
          serviceName: srvName,
          taskName: `${srvName} - ${newClient.name}`,
          frequency: srvKey === 'gst-monthly' ? 'Monthly' : 'Quarterly',
          status: 'Pending',
          assigneeName: 'Pooja Mehta',
          priority: 'Medium',
          targetDueDate: '2026-11-20',
        });
      });
    }

    // 3. Mark lead as converted
    const updatedLead: Lead = {
      ...lead,
      updatedAt: new Date().toISOString(),
    };
    (updatedLead as any).status = 'converted';
    appSyncService.saveLead(updatedLead);

    return {
      success: true,
      statusCode: 200,
      message: 'Lead converted to active client folder successfully',
      data: { lead: updatedLead, client: newClient },
    };
  },
};
