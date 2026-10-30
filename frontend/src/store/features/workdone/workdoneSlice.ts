import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaginationState {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}

export interface WorkDoneClient {
    clientId: string;
    businessName: string;
    legalName: string;
    totalCost: number;
    totalPaid: number;
    services: any[]; // keep generic for now
}

export interface WorkDoneState {
    items: WorkDoneClient[];
    selectedClient: WorkDoneClient | null;
    loading: boolean;
    mutating: boolean;
    error: string | null;
    pagination: PaginationState;
    currentParams: Record<string, any>;
    isLoaded: boolean;
}

const initialState: WorkDoneState = {
    items: [],
    selectedClient: null,
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

export const workdoneSlice = createSlice({
    name: 'workdone',
    initialState,
    reducers: {
        hydrateWorkDone: (
            state,
            action: PayloadAction<{ clients: WorkDoneClient[]; pagination?: PaginationState; params?: Record<string, any> }>
        ) => {
            state.items = action.payload.clients;
            state.isLoaded = true;
            state.loading = false;
            state.error = null;
            if (action.payload.pagination) {
                state.pagination = action.payload.pagination;
            } else {
                state.pagination.totalDocs = action.payload.clients.length;
                state.pagination.totalPages = Math.max(1, Math.ceil(action.payload.clients.length / (state.pagination.limit || 10)));
            }
            if (action.payload.params) {
                state.currentParams = action.payload.params;
            }
        },
        fetchWorkDoneRequest: (state, action: PayloadAction<Record<string, any> | undefined>) => {
            state.loading = true;
            state.error = null;
            if (action.payload) {
                state.currentParams = action.payload;
            }
        },
        fetchWorkDoneSuccess: (
            state,
            action: PayloadAction<{ clients: WorkDoneClient[]; pagination?: PaginationState }>
        ) => {
            state.loading = false;
            state.items = action.payload.clients;
            state.isLoaded = true;
            if (action.payload.pagination) {
                state.pagination = action.payload.pagination;
            } else {
                state.pagination.totalDocs = action.payload.clients.length;
                state.pagination.totalPages = Math.max(1, Math.ceil(action.payload.clients.length / (state.pagination.limit || 10)));
            }
        },
        fetchWorkDoneFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Additional actions (create, update, delete) can be added similarly
        clearWorkDoneError: (state) => {
            state.error = null;
        },
    },
});

export const {
    hydrateWorkDone,
    fetchWorkDoneRequest,
    fetchWorkDoneSuccess,
    fetchWorkDoneFailure,
    clearWorkDoneError,
} = workdoneSlice.actions;

export default workdoneSlice.reducer;
