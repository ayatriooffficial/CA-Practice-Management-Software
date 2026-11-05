import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ComplianceCategory,
  ComplianceGridRow,
  ComplianceGridColumn,
  ComplianceEntry,
  GetComplianceGridParams,
} from '@/types/compliance';

export interface ComplianceState {
  categories: ComplianceCategory[];
  rows: ComplianceGridRow[];
  columns: ComplianceGridColumn[];
  entries: ComplianceEntry[];
  clients: { id: string; name: string }[];
  loading: boolean;
  error: string | null;
  currentParams: GetComplianceGridParams;
  isLoaded: boolean;
}

const initialState: ComplianceState = {
  categories: [],
  rows: [],
  columns: [],
  entries: [],
  clients: [],
  loading: false,
  error: null,
  currentParams: {},
  isLoaded: false,
};

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
        clients?: { id: string; name: string }[];
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
        status: any;
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
  },
});

export const {
  fetchComplianceRequest,
  fetchComplianceSuccess,
  fetchComplianceFailure,
  setCategories,
  updateComplianceCell,
  clearComplianceError,
} = complianceSlice.actions;

export default complianceSlice.reducer;

