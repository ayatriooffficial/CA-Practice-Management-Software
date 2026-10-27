import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Service } from '@/data/serviceData';
import { ServiceQueryParams, ServiceStats } from '@/services/serviceApi';
import { PaginationState } from '../clients/clientSlice';

export interface ServiceState {
  items: Service[];
  selectedService: Service | null;
  stats: ServiceStats | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  pagination: PaginationState;
  currentParams: ServiceQueryParams;
  isLoaded: boolean;
}

const initialState: ServiceState = {
  items: [],
  selectedService: null,
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

export const serviceSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    hydrateServices: (
      state,
      action: PayloadAction<{ services: Service[]; pagination?: PaginationState; params?: ServiceQueryParams }>
    ) => {
      state.items = action.payload.services;
      state.isLoaded = true;
      state.loading = false;
      state.error = null;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.services.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.services.length / (state.pagination.limit || 10))
        );
      }
      if (action.payload.params) {
        state.currentParams = action.payload.params;
      }
    },
    fetchServicesRequest: (state, action: PayloadAction<ServiceQueryParams | undefined>) => {
      state.loading = true;
      state.error = null;
      if (action.payload) {
        state.currentParams = action.payload;
      }
    },
    fetchServicesSuccess: (
      state,
      action: PayloadAction<{ services: Service[]; pagination?: PaginationState }>
    ) => {
      state.loading = false;
      state.items = action.payload.services;
      state.isLoaded = true;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.services.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.services.length / (state.pagination.limit || 10))
        );
      }
    },
    fetchServicesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchServiceByIdRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchServiceByIdSuccess: (state, action: PayloadAction<Service>) => {
      state.loading = false;
      state.selectedService = action.payload;
      const index = state.items.findIndex((s) => s.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
    },
    fetchServiceByIdFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchServiceStatsRequest: (_state) => {},
    fetchServiceStatsSuccess: (state, action: PayloadAction<ServiceStats>) => {
      state.stats = action.payload;
    },

    createServiceRequest: (
      state,
      _action: PayloadAction<{ data: Partial<Service>; onSuccess?: (service: Service) => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createServiceSuccess: (state, action: PayloadAction<Service>) => {
      state.mutating = false;
      state.items = [action.payload, ...state.items];
      state.pagination.totalDocs += 1;
    },
    createServiceFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updateServiceRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        data: Partial<Service>;
        onSuccess?: (service: Service) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateServiceSuccess: (state, action: PayloadAction<Service>) => {
      state.mutating = false;
      const index = state.items.findIndex((s) => s.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = action.payload;
      }
      if (state.selectedService && state.selectedService.id === action.payload.id) {
        state.selectedService = action.payload;
      }
    },
    updateServiceFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    deleteServiceRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    deleteServiceSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.items = state.items.filter((s) => s.id !== action.payload);
      if (state.selectedService && state.selectedService.id === action.payload) {
        state.selectedService = null;
      }
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - 1);
    },
    deleteServiceFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    bulkDeleteServicesRequest: (
      state,
      _action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    bulkDeleteServicesSuccess: (state, action: PayloadAction<string[]>) => {
      state.mutating = false;
      const idSet = new Set(action.payload);
      state.items = state.items.filter((s) => !idSet.has(s.id));
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - action.payload.length);
    },
    bulkDeleteServicesFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    setSelectedService: (state, action: PayloadAction<Service | null>) => {
      state.selectedService = action.payload;
    },
    clearServiceError: (state) => {
      state.error = null;
    },
  },
});

export const {
  hydrateServices,
  fetchServicesRequest,
  fetchServicesSuccess,
  fetchServicesFailure,
  fetchServiceByIdRequest,
  fetchServiceByIdSuccess,
  fetchServiceByIdFailure,
  fetchServiceStatsRequest,
  fetchServiceStatsSuccess,
  createServiceRequest,
  createServiceSuccess,
  createServiceFailure,
  updateServiceRequest,
  updateServiceSuccess,
  updateServiceFailure,
  deleteServiceRequest,
  deleteServiceSuccess,
  deleteServiceFailure,
  bulkDeleteServicesRequest,
  bulkDeleteServicesSuccess,
  bulkDeleteServicesFailure,
  setSelectedService,
  clearServiceError,
} = serviceSlice.actions;

export default serviceSlice.reducer;
