import { request, ApiResponse } from './apiClient';

export interface GroupEntity {
  id: string;
  _id?: string;
  name: string;
  fileNo: string;
  type: string;
  pan?: string;
  mobile?: string;
  email?: string;
  status: string;
  active: boolean;
  openTasksCount?: number;
  readyToBillCount?: number;
  invoicesCount?: number;
  proformasCount?: number;
  outstandingAmount?: number;
}

export interface GroupStats {
  entitiesCount: number;
  openTasksCount: number;
  readyToBillCount: number;
  invoicesCount: number;
  proformasCount: number;
  totalInvoiceAmount?: number;
  outstandingAmount: number;
  pocName?: string;
  pocMobile?: string;
  pocEmail?: string;
}

export interface GroupRecord {
  id: string;
  _id?: string;
  groupId: string;
  name: string;
  description?: string;
  clientIds: GroupEntity[] | string[];
  entities?: GroupEntity[];
  pocClientId?: GroupEntity | string;
  poc?: any;
  status: 'Active' | 'Inactive';
  stats?: GroupStats;
  createdAt: string;
  updatedAt: string;
}

export interface GroupContactRecord {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  clientId: string;
  clientName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  designation?: string;
  isPrimary?: boolean;
  pan?: string;
  din?: string;
  dinStatus?: string;
  dinAppointmentDate?: string;
  appointmentDate?: string;
  dob?: string;
  aadharNumber?: string;
  aadhar?: string;
  passportNumber?: string;
  passport?: string;
  passportExpiryDate?: string;
  fatherName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  address?: string;
}

export interface GroupQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type GroupFilterParams = GroupQueryParams;

export type GroupListResponse = ApiResponse<GroupRecord[]>;

export const groupApi = {
  async listGroups(params: GroupQueryParams = {}): Promise<GroupListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return request<GroupRecord[]>(`/groups${query ? `?${query}` : ''}`);
  },

  async getGroupById(id: string): Promise<ApiResponse<GroupRecord>> {
    return request<GroupRecord>(`/groups/${id}`);
  },

  async createGroup(data: {
    name: string;
    groupId?: string;
    clientIds?: string[];
    pocClientId?: string;
    description?: string;
  }): Promise<ApiResponse<GroupRecord>> {
    return request<GroupRecord>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGroup(
    id: string,
    data: {
      name?: string;
      groupId?: string;
      clientIds?: string[];
      pocClientId?: string;
      description?: string;
      status?: 'Active' | 'Inactive';
    }
  ): Promise<ApiResponse<GroupRecord>> {
    return request<GroupRecord>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGroup(id: string): Promise<ApiResponse<{ message: string }>> {
    return request<{ message: string }>(`/groups/${id}`, {
      method: 'DELETE',
    });
  },

  async updateGroupPoc(id: string, pocClientId: string): Promise<ApiResponse<GroupRecord>> {
    return request<GroupRecord>(`/groups/${id}/poc`, {
      method: 'PUT',
      body: JSON.stringify({ pocClientId }),
    });
  },

  async removeClientFromGroup(groupId: string, clientId: string): Promise<ApiResponse<GroupRecord>> {
    return request<GroupRecord>(`/groups/${groupId}/clients/${clientId}`, {
      method: 'DELETE',
    });
  },

  async getGroupContacts(groupId: string): Promise<ApiResponse<GroupContactRecord[]>> {
    return request<GroupContactRecord[]>(`/groups/${groupId}/contacts`);
  },

  // Directory of contacts for autocomplete in Image 5
  async getDirectoryContacts(search: string = ''): Promise<ApiResponse<any[]>> {
    return request<any[]>(`/clients/contacts/directory?search=${encodeURIComponent(search)}`).catch(() => ({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: [],
    }));
  },
};
