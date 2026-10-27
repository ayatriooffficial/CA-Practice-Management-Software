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
    try {
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
      const res = await request<Service[]>(`/services${query ? `?${query}` : ''}`);
      if (res && res.data) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    return {
      success: true,
      statusCode: 200,
      data: [],
      message: 'Services retrieved',
    };
  },

  getServiceStats: async (): Promise<ApiResponse<ServiceStats>> => {
    try {
      const res = await request<ServiceStats>('/services/stats');
      if (res && res.data) return res;
    } catch {
      // Offline fallback
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Service stats retrieved',
      data: {
        totalServices: 0,
        activeServices: 0,
        recurringServices: 0,
        categoriesCount: 0,
        avgFee: 0,
      },
    };
  },

  getServiceById: async (id: string, includeDeleted = false): Promise<ApiResponse<Service>> => {
    const res = await request<Service>(`/services/${id}${includeDeleted ? '?includeDeleted=true' : ''}`);
    if (res && res.data) return res;
    throw new Error('Service not found');
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

  updateSop: async (
    id: string,
    sopData: {
      sop?: string;
      sopDetails?: import('@/data/serviceData').ServiceSop;
      purpose?: string;
      applicability?: string;
      steps?: string[];
    }
  ): Promise<ApiResponse<Service>> => {
    return request<Service>(`/services/${id}/sop`, {
      method: 'PATCH',
      body: JSON.stringify(sopData),
    });
  },

  getComments: async (
    id: string
  ): Promise<ApiResponse<import('@/data/serviceData').ServiceComment[]>> => {
    return request<import('@/data/serviceData').ServiceComment[]>(`/services/${id}/comments`);
  },

  addComment: async (
    id: string,
    comment: { text: string; author?: string; authorInitials?: string; avatarColor?: string }
  ): Promise<ApiResponse<Service>> => {
    return request<Service>(`/services/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  },
};
