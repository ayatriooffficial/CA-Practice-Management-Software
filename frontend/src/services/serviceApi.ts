import { request, ApiResponse } from './apiClient';
import { Service } from '@/data/serviceData';
import { Client } from '@/data/crmData';

export interface ServiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  frequency?: string;
  difficulty?: string;
  isRecurring?: boolean;
  status?: string;
  includeDeleted?: boolean;
}

export interface ServiceStats {
  totalServices: number;
  activeServices: number;
  recurringServices: number;
  categoriesCount: number;
  avgFee: number;
}

export const serviceApi = {
  getServices: async (params: ServiceQueryParams = {}): Promise<ApiResponse<Service[]>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.category) searchParams.set('category', params.category);
    if (params.frequency) searchParams.set('frequency', params.frequency);
    if (params.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params.isRecurring !== undefined) searchParams.set('isRecurring', String(params.isRecurring));
    if (params.status) searchParams.set('status', params.status);
    if (params.includeDeleted) searchParams.set('includeDeleted', 'true');

    const query = searchParams.toString();
    return request<Service[]>(`/services${query ? `?${query}` : ''}`);
  },

  getServiceStats: async (): Promise<ApiResponse<ServiceStats>> => {
    return request<ServiceStats>('/services/stats');
  },

  getServiceById: async (id: string, includeDeleted = false): Promise<ApiResponse<Service>> => {
    return request<Service>(`/services/${id}${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  createService: async (payload: Partial<Service>): Promise<ApiResponse<Service>> => {
    return request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateService: async (id: string, payload: Partial<Service>): Promise<ApiResponse<Service>> => {
    return request<Service>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  softDeleteService: async (id: string): Promise<ApiResponse<null>> => {
    return request<null>(`/services/${id}`, {
      method: 'DELETE',
    });
  },

  restoreService: async (id: string): Promise<ApiResponse<Service>> => {
    return request<Service>(`/services/${id}/restore`, {
      method: 'PATCH',
    });
  },

  hardDeleteService: async (id: string): Promise<ApiResponse<null>> => {
    return request<null>(`/services/${id}/hard`, {
      method: 'DELETE',
    });
  },

  syncServiceToTasks: async (id: string): Promise<ApiResponse<{ syncedTasksCount: number }>> => {
    return request<{ syncedTasksCount: number }>(`/services/${id}/sync`, {
      method: 'POST',
    });
  },

  toggleClientService: async (
    serviceId: string,
    clientId: string,
    enabled: boolean
  ): Promise<ApiResponse<Client>> => {
    return request<Client>(`/services/${serviceId}/clients/${clientId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  },
};
