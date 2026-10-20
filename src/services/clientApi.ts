import { request, ApiResponse } from './apiClient';
import { Client } from '@/data/crmData';

export interface ClientQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: string;
  group?: string;
  active?: boolean;
  city?: string;
  state?: string;
  tag?: string;
  includeDeleted?: boolean;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalDeleted: number;
  byType: Array<{ type: string; count: number }>;
  topGroups: Array<{ group: string; count: number }>;
}

export const clientApi = {
  getClients: async (params: ClientQueryParams = {}): Promise<ApiResponse<Client[]>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.type) searchParams.set('type', params.type);
    if (params.group) searchParams.set('group', params.group);
    if (params.active !== undefined) searchParams.set('active', String(params.active));
    if (params.city) searchParams.set('city', params.city);
    if (params.state) searchParams.set('state', params.state);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.includeDeleted) searchParams.set('includeDeleted', 'true');

    const query = searchParams.toString();
    return request<Client[]>(`/clients${query ? `?${query}` : ''}`);
  },

  getClientStats: async (): Promise<ApiResponse<ClientStats>> => {
    return request<ClientStats>('/clients/stats');
  },

  getClientById: async (id: string, includeDeleted = false): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  createClient: async (payload: Partial<Client>): Promise<ApiResponse<Client>> => {
    return request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateClient: async (id: string, payload: Partial<Client>): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  softDeleteClient: async (id: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}`, {
      method: 'DELETE',
    });
  },

  restoreClient: async (id: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/restore`, {
      method: 'PATCH',
    });
  },

  permanentDeleteClient: async (id: string): Promise<ApiResponse<null>> => {
    return request<null>(`/clients/${id}/permanent`, {
      method: 'DELETE',
    });
  },

  addCustomerFile: async (
    id: string,
    fileType: 'promoter' | 'statutory' | 'recurring',
    itemData: Record<string, unknown>
  ): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/files/${fileType}`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  removeCustomerFile: async (
    id: string,
    fileType: 'promoter' | 'statutory' | 'recurring',
    itemId: string | number
  ): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/files/${fileType}/${itemId}`, {
      method: 'DELETE',
    });
  },
};
