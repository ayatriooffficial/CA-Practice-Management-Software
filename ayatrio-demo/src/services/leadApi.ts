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
    return request<{ lead: Lead; client: any }>(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
