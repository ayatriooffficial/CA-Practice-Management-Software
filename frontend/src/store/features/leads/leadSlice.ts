import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lead } from '@/data/crmData';
import { LeadQueryParams, LeadStats, ConvertLeadPayload } from '@/services/leadApi';
import { PaginationState } from '../clients/clientSlice';

export interface LeadState {
  items: Lead[];
  selectedLead: Lead | null;
  stats: LeadStats | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  pagination: PaginationState;
  currentParams: LeadQueryParams;
  isLoaded: boolean;
}

const initialState: LeadState = {
  items: [],
  selectedLead: null,
  stats: null,
  loading: false,
  mutating: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    totalDocs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  currentParams: {},
  isLoaded: false,
};

export const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    hydrateLeads: (
      state,
      action: PayloadAction<{ leads: Lead[]; pagination?: PaginationState; params?: LeadQueryParams }>
    ) => {
      state.items = action.payload.leads;
      state.isLoaded = true;
      state.loading = false;
      state.error = null;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.leads.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.leads.length / (state.pagination.limit || 10))
        );
      }
      if (action.payload.params) {
        state.currentParams = action.payload.params;
      }
    },
    fetchLeadsRequest: (state, action: PayloadAction<LeadQueryParams | undefined>) => {
      state.loading = true;
      state.error = null;
      if (action.payload) {
        state.currentParams = action.payload;
      }
    },
    fetchLeadsSuccess: (
      state,
      action: PayloadAction<{ leads: Lead[]; pagination?: PaginationState }>
    ) => {
      state.loading = false;
      state.items = action.payload.leads;
      state.isLoaded = true;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.leads.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.leads.length / (state.pagination.limit || 10))
        );
      }
    },
    fetchLeadsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchLeadByIdRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchLeadByIdSuccess: (state, action: PayloadAction<Lead>) => {
      state.loading = false;
      state.selectedLead = action.payload;
      const index = state.items.findIndex((l) => l.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    },
    fetchLeadByIdFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchLeadStatsRequest: (_state) => {},
    fetchLeadStatsSuccess: (state, action: PayloadAction<LeadStats>) => {
      state.stats = action.payload;
    },

    createLeadRequest: (
      state,
      _action: PayloadAction<{ data: Partial<Lead>; onSuccess?: (lead: Lead) => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createLeadSuccess: (state, action: PayloadAction<Lead>) => {
      state.mutating = false;
      state.items = [action.payload, ...state.items];
      state.pagination.totalDocs += 1;
    },
    createLeadFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updateLeadRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        data: Partial<Lead>;
        onSuccess?: (lead: Lead) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateLeadSuccess: (state, action: PayloadAction<Lead>) => {
      state.mutating = false;
      const index = state.items.findIndex((l) => l.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
      if (state.selectedLead && state.selectedLead.id === action.payload.id) {
        state.selectedLead = action.payload;
      }
    },
    updateLeadFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    deleteLeadRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    deleteLeadSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.items = state.items.filter((l) => l.id !== action.payload);
      if (state.selectedLead && state.selectedLead.id === action.payload) {
        state.selectedLead = null;
      }
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - 1);
    },
    deleteLeadFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    bulkDeleteLeadsRequest: (
      state,
      _action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    bulkDeleteLeadsSuccess: (state, action: PayloadAction<string[]>) => {
      state.mutating = false;
      const idSet = new Set(action.payload);
      state.items = state.items.filter((l) => !idSet.has(l.id));
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - action.payload.length);
    },
    bulkDeleteLeadsFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    convertLeadRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        payload: ConvertLeadPayload;
        onSuccess?: (res: { lead: Lead; client: any }) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    convertLeadSuccess: (state, action: PayloadAction<Lead>) => {
      state.mutating = false;
      const index = state.items.findIndex((l) => l.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    },
    convertLeadFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    setSelectedLead: (state, action: PayloadAction<Lead | null>) => {
      state.selectedLead = action.payload;
    },
    clearLeadError: (state) => {
      state.error = null;
    },
  },
});

export const {
  hydrateLeads,
  fetchLeadsRequest,
  fetchLeadsSuccess,
  fetchLeadsFailure,
  fetchLeadByIdRequest,
  fetchLeadByIdSuccess,
  fetchLeadByIdFailure,
  fetchLeadStatsRequest,
  fetchLeadStatsSuccess,
  createLeadRequest,
  createLeadSuccess,
  createLeadFailure,
  updateLeadRequest,
  updateLeadSuccess,
  updateLeadFailure,
  deleteLeadRequest,
  deleteLeadSuccess,
  deleteLeadFailure,
  bulkDeleteLeadsRequest,
  bulkDeleteLeadsSuccess,
  bulkDeleteLeadsFailure,
  convertLeadRequest,
  convertLeadSuccess,
  convertLeadFailure,
  setSelectedLead,
  clearLeadError,
} = leadSlice.actions;

export default leadSlice.reducer;
