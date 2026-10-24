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
      if (res && res.data && res.data.length > 0) {
        return res;
      }
    } catch {
      // Offline fallback
    }

    const { appSyncService } = await import('./appSyncService');
    const localServices = appSyncService.getServices();
    let filtered = [...localServices];
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }
    if (params.category && params.category !== 'All Categories') {
      filtered = filtered.filter((s) => s.category === params.category);
    }
    if (params.frequency) {
      filtered = filtered.filter((s) => s.frequency === params.frequency);
    }
    return {
      success: true,
      statusCode: 200,
      data: filtered,
      message: 'Services retrieved (synced storage)',
    };
  },

  getServiceStats: async (): Promise<ApiResponse<ServiceStats>> => {
    try {
      const res = await request<ServiceStats>('/services/stats');
      if (res && res.data) return res;
    } catch {
      // Offline fallback
    }
    const { appSyncService } = await import('./appSyncService');
    const all = appSyncService.getServices();
    return {
      success: true,
      statusCode: 200,
      message: 'Service stats retrieved',
      data: {
        totalServices: all.length,
        activeServices: all.filter((s) => s.status === 'Active').length,
        recurringServices: all.filter((s) => s.isRecurring).length,
        categoriesCount: Array.from(new Set(all.map((s) => s.category))).length,
        avgFee: Math.round(
          all.reduce((acc, s) => acc + (s.professionalFee || 0), 0) / (all.length || 1)
        ),
      },
    };
  },

  getServiceById: async (id: string, includeDeleted = false): Promise<ApiResponse<Service>> => {
    try {
      const res = await request<Service>(`/services/${id}${includeDeleted ? '?includeDeleted=true' : ''}`);
      if (res && res.data) return res;
    } catch {
      // Offline fallback
    }
    const { appSyncService } = await import('./appSyncService');
    const s = appSyncService.getServices().find((item) => item.id === id || item.name === id);
    if (s) {
      return {
        success: true,
        statusCode: 200,
        message: 'Service retrieved',
        data: s,
      };
    }
    throw new Error('Service not found');
  },

  createService: async (payload: Partial<Service>): Promise<ApiResponse<Service>> => {
    try {
      const res = await request<Service>('/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res.data) {
        const { appSyncService } = await import('./appSyncService');
        appSyncService.saveService(res.data);
        return res;
      }
    } catch {
      // Offline fallback
    }
    const { appSyncService } = await import('./appSyncService');
    const newService: Service = {
      id: payload.id || `srv-${Date.now()}`,
      name: payload.name || 'New Service',
      category: payload.category || 'GST',
      frequency: payload.frequency || 'Monthly',
      status: payload.status || 'Active',
      isRecurring: payload.isRecurring ?? true,
      ...payload,
    } as Service;
    appSyncService.saveService(newService);
    return {
      success: true,
      statusCode: 201,
      data: newService,
      message: 'Service created (synced)',
    };
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
