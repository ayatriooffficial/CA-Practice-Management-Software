import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Client } from '@/data/crmData';
import { ClientQueryParams, ClientStats } from '@/services/clientApi';

export interface PaginationState {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ClientState {
  items: Client[];
  selectedClient: Client | null;
  stats: ClientStats | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  pagination: PaginationState;
  currentParams: ClientQueryParams;
  isLoaded: boolean;
}

const initialState: ClientState = {
  items: [],
  selectedClient: null,
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

export const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    hydrateClients: (
      state,
      action: PayloadAction<{ clients: Client[]; pagination?: PaginationState; params?: ClientQueryParams }>
    ) => {
      state.items = action.payload.clients;
      state.isLoaded = true;
      state.loading = false;
      state.error = null;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.clients.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.clients.length / (state.pagination.limit || 10))
        );
      }
      if (action.payload.params) {
        state.currentParams = action.payload.params;
      }
    },
    // Action triggers for Saga
    fetchClientsRequest: (state, action: PayloadAction<ClientQueryParams | undefined>) => {
      state.loading = true;
      state.error = null;
      if (action.payload) {
        state.currentParams = action.payload;
      }
    },
    fetchClientsSuccess: (
      state,
      action: PayloadAction<{ clients: Client[]; pagination?: PaginationState }>
    ) => {
      state.loading = false;
      state.items = action.payload.clients;
      state.isLoaded = true;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.clients.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.clients.length / (state.pagination.limit || 10))
        );
      }
    },
    fetchClientsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchClientByIdRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchClientByIdSuccess: (state, action: PayloadAction<Client>) => {
      state.loading = false;
      state.selectedClient = action.payload;
      const targetId = action.payload.id || (action.payload as any)._id;
      const index = state.items.findIndex(
        (c) => c.id === targetId || (c as any)._id === targetId
      );
      if (index >= 0) {
        state.items[index] = action.payload;
      } else {
        state.items = [action.payload, ...state.items];
        state.pagination.totalDocs = (state.pagination.totalDocs || 0) + 1;
      }
    },
    fetchClientByIdFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchClientStatsRequest: (_state) => {},
    fetchClientStatsSuccess: (state, action: PayloadAction<ClientStats>) => {
      state.stats = action.payload;
    },

    createClientRequest: (
      state,
      _action: PayloadAction<{ data: Partial<Client>; onSuccess?: (client: Client) => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createClientSuccess: (state, action: PayloadAction<Client>) => {
      state.mutating = false;
      state.items = [action.payload, ...state.items];
      state.pagination.totalDocs += 1;
    },
    createClientFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updateClientRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        data: Partial<Client>;
        onSuccess?: (client: Client) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateClientSuccess: (state, action: PayloadAction<Client>) => {
      state.mutating = false;
      const index = state.items.findIndex(
        (c) => c.id === action.payload.id || (c as any)._id === action.payload.id
      );
      if (index >= 0) {
        state.items[index] = action.payload;
      }
      if (
        state.selectedClient &&
        (state.selectedClient.id === action.payload.id ||
          (state.selectedClient as any)._id === action.payload.id)
      ) {
        state.selectedClient = action.payload;
      }
    },
    updateClientFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    deleteClientRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    deleteClientSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.items = state.items.filter(
        (c) => c.id !== action.payload && (c as any)._id !== action.payload
      );
      if (
        state.selectedClient &&
        (state.selectedClient.id === action.payload ||
          (state.selectedClient as any)._id === action.payload)
      ) {
        state.selectedClient = null;
      }
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - 1);
    },
    deleteClientFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    bulkDeleteClientsRequest: (
      state,
      _action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    bulkDeleteClientsSuccess: (state, action: PayloadAction<string[]>) => {
      state.mutating = false;
      const idSet = new Set(action.payload);
      state.items = state.items.filter(
        (c) => !idSet.has(c.id) && !idSet.has((c as any)._id)
      );
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - action.payload.length);
    },
    bulkDeleteClientsFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    setSelectedClient: (state, action: PayloadAction<Client | null>) => {
      state.selectedClient = action.payload;
      if (action.payload) {
        const targetId = action.payload.id || (action.payload as any)._id;
        const index = state.items.findIndex(
          (c) => c.id === targetId || (c as any)._id === targetId
        );
        if (index >= 0) {
          state.items[index] = action.payload;
        } else {
          state.items = [action.payload, ...state.items];
          state.pagination.totalDocs = (state.pagination.totalDocs || 0) + 1;
        }
      }
    },
    clearClientError: (state) => {
      state.error = null;
    },
  },
});

export const {
  hydrateClients,
  fetchClientsRequest,
  fetchClientsSuccess,
  fetchClientsFailure,
  fetchClientByIdRequest,
  fetchClientByIdSuccess,
  fetchClientByIdFailure,
  fetchClientStatsRequest,
  fetchClientStatsSuccess,
  createClientRequest,
  createClientSuccess,
  createClientFailure,
  updateClientRequest,
  updateClientSuccess,
  updateClientFailure,
  deleteClientRequest,
  deleteClientSuccess,
  deleteClientFailure,
  bulkDeleteClientsRequest,
  bulkDeleteClientsSuccess,
  bulkDeleteClientsFailure,
  setSelectedClient,
  clearClientError,
} = clientSlice.actions;

export default clientSlice.reducer;
