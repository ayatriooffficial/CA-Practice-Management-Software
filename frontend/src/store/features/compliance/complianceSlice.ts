import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ComplianceCategory,
  ComplianceGridRow,
  ComplianceGridColumn,
  ComplianceEntry,
  ComplianceCellStatus,
  GetComplianceGridParams,
  GstSyncRequest,
  GstSyncResponse,
} from '@/types/compliance';
import { pageStateCache } from '@/services/pageStateCache';

export interface ComplianceState {
  categories: ComplianceCategory[];
  rows: ComplianceGridRow[];
  columns: ComplianceGridColumn[];
  entries: ComplianceEntry[];
  clients: { id: string; name: string; lastSyncAt?: string | null }[];
  loading: boolean;
  isSyncingGst: boolean;
  gstSyncResult: GstSyncResponse | null;
  error: string | null;
  currentParams: GetComplianceGridParams;
  isLoaded: boolean;
}

const getInitialComplianceState = (): ComplianceState => {
  const cached = typeof window !== 'undefined' ? pageStateCache.get<any>('compliance_grid_data') : null;
  return {
    categories: [],
    rows: cached?.rows || [],
    columns: cached?.columns || [],
    entries: cached?.entries || [],
    clients: cached?.clients || [],
    loading: false,
    isSyncingGst: false,
    gstSyncResult: null,
    error: null,
    currentParams: {},
    isLoaded: Boolean(cached?.rows?.length),
  };
};

const initialState: ComplianceState = getInitialComplianceState();

export const complianceSlice = createSlice({
  name: 'compliance',
  initialState,
  reducers: {
    // Action triggers for Saga
    fetchComplianceRequest: (
      state,
      action: PayloadAction<GetComplianceGridParams | undefined>
    ) => {
      state.loading = true;
      state.error = null;
      if (action.payload) {
        state.currentParams = action.payload;
      }
    },
    fetchComplianceSuccess: (
      state,
      action: PayloadAction<{
        rows: ComplianceGridRow[];
        columns: ComplianceGridColumn[];
        entries?: ComplianceEntry[];
        clients?: { id: string; name: string; lastSyncAt?: string | null }[];
      }>
    ) => {
      state.loading = false;
      state.rows = action.payload.rows;
      state.columns = action.payload.columns;
      if (action.payload.entries) {
        state.entries = action.payload.entries;
      }
      if (action.payload.clients) {
        state.clients = action.payload.clients;
      }
      state.isLoaded = true;
    },
    fetchComplianceFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    setCategories: (state, action: PayloadAction<ComplianceCategory[]>) => {
      state.categories = action.payload;
    },
    updateComplianceCell: (
      state,
      action: PayloadAction<{
        itemId: string;
        colKey: string;
        status: ComplianceCellStatus;
        entry: ComplianceEntry;
      }>
    ) => {
      const { itemId, colKey, status, entry } = action.payload;
      state.rows = state.rows.map((r) => {
        if (r.item.id === itemId) {
          return {
            ...r,
            cells: {
              ...r.cells,
              [colKey]: {
                status,
                entry,
              },
            },
          };
        }
        return r;
      });
    },
    clearComplianceError: (state) => {
      state.error = null;
    },
    syncGstRequest: (state, _action: PayloadAction<GstSyncRequest | undefined>) => {
      state.isSyncingGst = true;
      state.error = null;
    },
    syncGstSuccess: (state, action: PayloadAction<GstSyncResponse>) => {
      state.isSyncingGst = false;
      state.gstSyncResult = action.payload;
    },
    syncGstFailure: (state, action: PayloadAction<string>) => {
      state.isSyncingGst = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchComplianceRequest,
  fetchComplianceSuccess,
  fetchComplianceFailure,
  setCategories,
  updateComplianceCell,
  clearComplianceError,
  syncGstRequest,
  syncGstSuccess,
  syncGstFailure,
} = complianceSlice.actions;

export default complianceSlice.reducer;

