import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const EMAIL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

export interface EmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from?: string;
  sender?: string;
  to?: string;
  snippet?: string;
  date?: string;
  unread?: boolean;
  messageCount?: number;
  body?: string;
}

export interface EmailState {
  items: EmailMessage[];
  loading: boolean;
  error: string | null;
  isLoaded: boolean;
  lastFetched: number | null; // Epoch timestamp
}

const initialState: EmailState = {
  items: [],
  loading: false,
  error: null,
  isLoaded: false,
  lastFetched: null,
};

export const emailSlice = createSlice({
  name: 'emails',
  initialState,
  reducers: {
    fetchEmailsRequest: (
      state,
      _action: PayloadAction<{ forceRefresh?: boolean; query?: string } | undefined>
    ) => {
      state.loading = true;
      state.error = null;
    },
    fetchEmailsSuccess: (
      state,
      action: PayloadAction<{ items: EmailMessage[] }>
    ) => {
      state.items = action.payload.items;
      state.loading = false;
      state.isLoaded = true;
      state.lastFetched = Date.now();
    },
    fetchEmailsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearEmailCache: (state) => {
      state.items = [];
      state.isLoaded = false;
      state.lastFetched = null;
      state.error = null;
    },
  },
});

export const {
  fetchEmailsRequest,
  fetchEmailsSuccess,
  fetchEmailsFailure,
  clearEmailCache,
} = emailSlice.actions;

export default emailSlice.reducer;

