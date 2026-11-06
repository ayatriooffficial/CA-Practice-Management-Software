import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Notice, GetNoticesParams, NoticeSummary } from '@/types/notices';
import { PaginationState } from '../clients/clientSlice';

export interface NoticeState {
  items: Notice[];
  selectedNotice: Notice | null;
  summary: NoticeSummary | null;
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  currentParams: GetNoticesParams;
  isLoaded: boolean;
}

const initialState: NoticeState = {
  items: [],
  selectedNotice: null,
  summary: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    totalDocs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  currentParams: {},
  isLoaded: false,
};

export const noticeSlice = createSlice({
  name: 'notices',
  initialState,
  reducers: {
    // Action triggers for Saga
    fetchNoticesRequest: (
      state,
      action: PayloadAction<GetNoticesParams | undefined>
    ) => {
      state.loading = true;
      state.error = null;
      if (action.payload) {
        state.currentParams = action.payload;
      }
    },
    fetchNoticesSuccess: (
      state,
      action: PayloadAction<{
        notices: Notice[];
        summary?: NoticeSummary;
        pagination?: PaginationState;
      }>
    ) => {
      state.loading = false;
      state.items = action.payload.notices;
      state.isLoaded = true;
      if (action.payload.summary) {
        state.summary = action.payload.summary;
      }
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.notices.length;
        state.pagination.totalPages = Math.max(
          1,
          Math.ceil(action.payload.notices.length / (state.pagination.limit || 50))
        );
      }
    },
    fetchNoticesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    setSelectedNotice: (state, action: PayloadAction<Notice | null>) => {
      state.selectedNotice = action.payload;
    },
    clearNoticeError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchNoticesRequest,
  fetchNoticesSuccess,
  fetchNoticesFailure,
  setSelectedNotice,
  clearNoticeError,
} = noticeSlice.actions;

export default noticeSlice.reducer;

