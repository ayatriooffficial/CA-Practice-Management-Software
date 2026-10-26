import { request, ApiResponse, ApiError } from './apiClient';
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
    try {
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
      const res = await request<Client[]>(`/clients${query ? `?${query}` : ''}`);
      if (res && res.data && res.data.length > 0) {
        res.data = res.data.map((c: any) => ({
          ...c,
          id: c.id || c._id?.toString() || c._id,
        }));
        return res;
      }
    } catch {
      // Offline fallback
    }

    const { appSyncService } = await import('./appSyncService');
    const localClients = appSyncService.getClients();
    let filtered = [...localClients];
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.fileNo && c.fileNo.toLowerCase().includes(q)) ||
          (c.pan && c.pan.toLowerCase().includes(q))
      );
    }
    return {
      success: true,
      statusCode: 200,
      data: filtered,
      message: 'Clients retrieved (synced storage)',
    };
  },

  getClientStats: async (): Promise<ApiResponse<ClientStats>> => {
    try {
      const res = await request<ClientStats>('/clients/stats');
      if (res && res.data) return res;
    } catch {
      // Offline fallback
    }
    const { appSyncService } = await import('./appSyncService');
    const all = appSyncService.getClients();
    return {
      success: true,
      statusCode: 200,
      message: 'Client stats retrieved',
      data: {
        totalClients: all.length,
        activeClients: all.filter((c) => c.active).length,
        inactiveClients: all.filter((c) => !c.active).length,
        totalDeleted: 0,
        byType: [
          { type: 'private-limited', count: all.filter((c) => c.type === 'private-limited').length },
          { type: 'individual', count: all.filter((c) => c.type === 'individual').length },
        ],
        topGroups: [
          { group: 'Corporate', count: all.filter((c) => c.group === 'Corporate').length },
          { group: 'Retail', count: all.filter((c) => c.group === 'Retail').length },
        ],
      },
    };
  },

  getClientById: async (id: string, includeDeleted = false): Promise<ApiResponse<Client>> => {
    try {
      const res = await request<Client>(`/clients/${id}${includeDeleted ? '?includeDeleted=true' : ''}`);
      if (res && res.data) {
        const c: any = res.data;
        c.id = c.id || c._id?.toString() || c._id;
        return res;
      }
    } catch {
      // Offline fallback
    }
    const { appSyncService } = await import('./appSyncService');
    const client = appSyncService.getClients().find((c) => c.id === id || c.fileNo === id);
    if (client) {
      return {
        success: true,
        statusCode: 200,
        message: 'Client retrieved',
        data: client,
      };
    }
    throw new Error('Client not found');
  },

  createClient: async (payload: Partial<Client>): Promise<ApiResponse<Client>> => {
    try {
      const res = await request<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res && res.data) {
        const { appSyncService } = await import('./appSyncService');
        appSyncService.saveClient(res.data);
        return res;
      }
    } catch (err: any) {
      if ((err instanceof ApiError && err.statusCode > 0) || (err?.statusCode && err.statusCode > 0)) {
        throw err;
      }
      console.warn('Backend server unreachable, falling back to local storage:', err);
    }
    const { appSyncService } = await import('./appSyncService');
    const newClient: Client = {
      id: payload.id || `client-${Date.now()}`,
      fileNo: payload.fileNo || `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      name: payload.name || 'New Client',
      type: payload.type || 'individual',
      group: payload.group || 'General',
      active: payload.active ?? true,
      email: payload.email || '',
      mobile: payload.mobile || '',
      pan: payload.pan || '',
      ...payload,
    } as Client;
    appSyncService.saveClient(newClient);
    return {
      success: true,
      statusCode: 201,
      data: newClient,
      message: 'Client created (synced)',
    };
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

  addLicense: async (id: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/licenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateLicense: async (id: string, licenseId: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/licenses/${licenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteLicense: async (id: string, licenseId: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/licenses/${licenseId}`, {
      method: 'DELETE',
    });
  },

  addDsc: async (id: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/dscs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteDsc: async (id: string, dscId: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/dscs/${dscId}`, {
      method: 'DELETE',
    });
  },

  addDocumentInOut: async (id: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/documents-in-out`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateDocumentInOut: async (id: string, docId: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/documents-in-out/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteDocumentInOut: async (id: string, docId: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/documents-in-out/${docId}`, {
      method: 'DELETE',
    });
  },

  updateServiceSettings: async (id: string, settings: any[]): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/service-settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },

  addPassword: async (id: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/passwords`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deletePassword: async (id: string, pwdId: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/passwords/${pwdId}`, {
      method: 'DELETE',
    });
  },

  addNote: async (id: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteNote: async (id: string, noteId: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  addContact: async (id: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateContact: async (id: string, contactId: string, payload: any): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteContact: async (id: string, contactId: string): Promise<ApiResponse<Client>> => {
    return request<Client>(`/clients/${id}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  },
};
