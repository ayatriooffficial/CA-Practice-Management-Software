import { request, type ApiResponse } from './apiClient';
import type {
  ComplianceCategory,
  ComplianceGridResponse,
  GetComplianceGridParams,
  ComplianceEntry,
  ComplianceCellStatus,
  SyncEntitlement,
  ComplianceItem,
} from '@/types/compliance';
import type { CalendarEvent } from '@/types/notices';
import { syncApi } from './syncApi';

const query = (params: Record<string, string | undefined>) => {
  const values = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return values.length ? `?${new URLSearchParams(values.map(([key, value]) => [key, value as string]))}` : '';
};

export const complianceApi = {
  getCategories: async (): Promise<ApiResponse<ComplianceCategory[]>> => {
    const response = await request<(ComplianceCategory & { categoryId?: string })[]>('/compliance/categories');
    return {
      ...response,
      data: (response.data || []).map((category) => ({ ...category, id: category.categoryId ?? category.id })),
    };
  },

  getGrid: (params: GetComplianceGridParams = {}): Promise<ApiResponse<ComplianceGridResponse>> =>
    request<Record<string, unknown>>('/compliance/grid' + query({
      categoryId: params.categoryId,
      fy: params.fy
        ? params.fy.startsWith('FY ') ? params.fy : `FY ${params.fy.length === 7 ? `${params.fy.slice(0, 4)}-20${params.fy.slice(5)}` : params.fy}`
        : undefined,
      frequency: params.frequency === 'ALL' ? 'all' : params.frequency,
      search: params.search,
    })).then((response) => ({
      ...response,
      data: {
        ...response.data,
        rows: (Array.isArray(response.data?.rows) ? response.data.rows : []).map((row) => {
          const value = row as Record<string, unknown>;
          const rawCells = (value.cells ?? {}) as Record<string, Record<string, unknown> | null>;
          const itemValue = (value.item ?? {}) as Record<string, unknown>;
          const item: ComplianceItem = value.item ? (itemValue as unknown as ComplianceItem) : {
            id: String(value.itemId || ''),
            clientId: String(value.clientId || ''),
            categoryId: String(value.categoryId ?? params.categoryId ?? ''),
            identifier: value.identifier as string | undefined,
            state: value.state as string | undefined,
            formCode: String(value.formCode ?? ''),
            label: String(value.label ?? ''),
            kind: value.kind as ComplianceItem['kind'],
            frequency: value.frequency as ComplianceItem['frequency'],
            isCustom: Boolean(value.isCustom),
          };
          return {
            clientId: String(value.clientId || ''),
            clientName: String(value.clientName ?? ''),
            item,
            cells: Object.fromEntries(Object.entries(rawCells).map(([key, cell]) => {
              if (!cell) return [key, null];
              return [key, {
                status: String(cell.status ?? '').toUpperCase() as ComplianceCellStatus,
                entry: {
                  id: String(cell.entryId || ''),
                  itemId: String(item.id),
                  fy: params.fy ?? 'FY 2025-2026',
                  periodKey: key,
                  dueDate: String(cell.dueDate ?? ''),
                  filedOn: cell.filedOn as string | null | undefined,
                  documents: Array.isArray(cell.documents) ? cell.documents : [],
                  source: 'portal',
                },
              }];
            })),
          };
        }),
      } as unknown as ComplianceGridResponse,
    })),

  upsertEntry: (entry: Partial<ComplianceEntry> & { statusOverride?: Lowercase<ComplianceCellStatus> }): Promise<ApiResponse<ComplianceEntry>> =>
    request<ComplianceEntry>('/compliance/entries', { method: 'PUT', body: JSON.stringify(entry) }),

  refreshItems: (payload: { categoryId?: string; clientId?: string } = {}): Promise<ApiResponse<{ retired: number }>> =>
    request<{ retired: number }>('/compliance/items/refresh', { method: 'POST', body: JSON.stringify(payload) }),

  getEntitlement: (): Promise<ApiResponse<SyncEntitlement & { credits: number }>> => syncApi.getEntitlement(),

  getCalendar: (params: { month?: string } = {}): Promise<ApiResponse<CalendarEvent[]>> =>
    request<CalendarEvent[]>('/compliance/calendar' + query(params)),
};

export const getComplianceCategories = async () => (await complianceApi.getCategories()).data;
export const getComplianceGrid = async (params: GetComplianceGridParams = {}) => (await complianceApi.getGrid(params)).data;
export const getSyncEntitlement = async () => (await complianceApi.getEntitlement()).data;

export async function setEntryStatus(entryId: string, status: 'FILED' | 'MISSED' | 'PENDING', fy = 'FY 2025-2026') {
  const [itemId, ...periodParts] = entryId.split('_');
  const periodKey = periodParts.join('_');
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = status === 'MISSED'
    ? new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    : status === 'PENDING'
      ? new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
      : today;
  const response = await complianceApi.upsertEntry({
    itemId,
    fy,
    periodKey,
    dueDate,
    filedOn: status === 'FILED' ? today : null,
    statusOverride: status.toLowerCase() as 'filed' | 'missed' | 'pending',
    source: 'manual',
    documents: [],
  });
  return response.data;
}
