import { request, type ApiResponse } from './apiClient';
import type { SyncJob, SyncClientsParams, ActivityLog } from '@/types/notices';
import type { SyncEntitlement } from '@/types/compliance';

const query = (params: Record<string, string | number | undefined>) => {
  const values = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return values.length ? `?${new URLSearchParams(values.map(([key, value]) => [key, String(value)]))}` : '';
};

export interface SyncRequest extends SyncClientsParams {
  triggeredBy?: string;
  isFreeSync?: boolean;
}

export const syncApi = {
  syncClients: (payload: SyncRequest): Promise<ApiResponse<SyncJob>> =>
    request<SyncJob>('/sync/clients', { method: 'POST', body: JSON.stringify(payload) }),
  syncCompliance: (payload: SyncRequest): Promise<ApiResponse<SyncJob>> =>
    request<SyncJob>('/sync/clients', { method: 'POST', body: JSON.stringify({ ...payload, module: 'compliance' }) }),
  freeSync: (payload: SyncRequest): Promise<ApiResponse<SyncJob>> =>
    request<SyncJob>('/sync/clients', { method: 'POST', body: JSON.stringify({ ...payload, module: 'compliance', isFreeSync: true }) }),
  getEntitlement: (): Promise<ApiResponse<SyncEntitlement & { credits: number }>> =>
    request<SyncEntitlement & { credits: number }>('/sync/entitlement'),
  getJobs: (params: Record<string, string | number | undefined> = {}): Promise<ApiResponse<SyncJob[]>> =>
    request<SyncJob[]>('/sync/jobs' + query(params)),
  getActivity: (params: Record<string, string | number | undefined> = {}): Promise<ApiResponse<ActivityLog[]>> =>
    request<ActivityLog[]>('/sync/activity' + query(params)),
};

export const syncClients = async (payload: SyncRequest) => (await syncApi.syncClients(payload)).data;
export const getSyncJobs = async (params: Record<string, string | number | undefined> = {}) => (await syncApi.getJobs(params)).data;
export const getActivityLogs = async (params: Record<string, string | number | undefined> = {}) => (await syncApi.getActivity(params)).data;
