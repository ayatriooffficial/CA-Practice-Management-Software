import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GroupRecord, GroupContactRecord, GroupFilterParams } from '@/services/groupApi';

export interface GroupState {
  items: GroupRecord[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
  };
  filters: GroupFilterParams;
  selectedGroup: GroupRecord | null;
  selectedGroupContacts: GroupContactRecord[];
  loading: boolean;
  contactsLoading: boolean;
  submitting: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: GroupState = {
  items: [],
  pagination: {
    page: 1,
    limit: 25,
    totalDocs: 0,
    totalPages: 1,
  },
  filters: {
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 25,
  },
  selectedGroup: null,
  selectedGroupContacts: [],
  loading: false,
  contactsLoading: false,
  submitting: false,
  error: null,
  lastFetched: null,
};

export const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    fetchGroupsRequest: (state, action: PayloadAction<{ force?: boolean; params?: GroupFilterParams } | undefined>) => {
      if (!state.lastFetched || action.payload?.force) {
        state.loading = true;
      }
      if (action.payload?.params) {
        state.filters = { ...state.filters, ...action.payload.params };
      }
      state.error = null;
    },
    fetchGroupsSuccess: (
      state,
      action: PayloadAction<{
        items: GroupRecord[];
        pagination: { page: number; limit: number; totalDocs: number; totalPages: number };
      }>
    ) => {
      state.items = action.payload.items;
      state.pagination = action.payload.pagination;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    fetchGroupsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchGroupDetailRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchGroupDetailSuccess: (state, action: PayloadAction<GroupRecord>) => {
      state.selectedGroup = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchGroupContactsRequest: (state, _action: PayloadAction<string>) => {
      state.contactsLoading = true;
    },
    fetchGroupContactsSuccess: (state, action: PayloadAction<GroupContactRecord[]>) => {
      state.selectedGroupContacts = action.payload;
      state.contactsLoading = false;
    },
    createGroupRequest: (
      state,
      _action: PayloadAction<{
        data: { name: string; groupId?: string; clientIds?: string[]; pocClientId?: string; description?: string };
        onSuccess?: () => void;
      }>
    ) => {
      state.submitting = true;
      state.error = null;
    },
    createGroupSuccess: (state, action: PayloadAction<GroupRecord>) => {
      state.submitting = false;
      state.items.unshift(action.payload);
      state.pagination.totalDocs += 1;
      state.lastFetched = null; // Invalidate cache
    },
    updateGroupRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        data: { name?: string; groupId?: string; clientIds?: string[]; pocClientId?: string; description?: string };
        onSuccess?: () => void;
      }>
    ) => {
      state.submitting = true;
      state.error = null;
    },
    updateGroupSuccess: (state, action: PayloadAction<GroupRecord>) => {
      state.submitting = false;
      const idx = state.items.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = action.payload;
      }
      if (state.selectedGroup?.id === action.payload.id) {
        state.selectedGroup = action.payload;
      }
      state.lastFetched = null; // Invalidate cache
    },
    deleteGroupRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.submitting = true;
      state.error = null;
    },
    deleteGroupSuccess: (state, action: PayloadAction<string>) => {
      state.submitting = false;
      state.items = state.items.filter((g) => g.id !== action.payload);
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - 1);
      if (state.selectedGroup?.id === action.payload) {
        state.selectedGroup = null;
      }
      state.lastFetched = null;
    },
    updatePocRequest: (
      state,
      _action: PayloadAction<{ groupId: string; pocClientId: string; onSuccess?: () => void }>
    ) => {
      state.submitting = true;
    },
    updatePocSuccess: (state, action: PayloadAction<GroupRecord>) => {
      state.submitting = false;
      if (state.selectedGroup && state.selectedGroup.id === action.payload.id) {
        state.selectedGroup.pocClientId = action.payload.pocClientId;
        state.selectedGroup.poc = action.payload.poc;
      }
      const idx = state.items.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = action.payload;
      }
      state.lastFetched = null;
    },
    removeClientRequest: (
      state,
      _action: PayloadAction<{ groupId: string; clientId: string; onSuccess?: () => void }>
    ) => {
      state.submitting = true;
    },
    removeClientSuccess: (state, action: PayloadAction<GroupRecord>) => {
      state.submitting = false;
      if (state.selectedGroup && state.selectedGroup.id === action.payload.id) {
        state.selectedGroup = action.payload;
      }
      const idx = state.items.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = action.payload;
      }
      state.lastFetched = null;
    },
    setGroupFilters: (state, action: PayloadAction<Partial<GroupFilterParams>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    invalidateGroups: (state) => {
      state.lastFetched = null;
    },
  },
});

export const {
  fetchGroupsRequest,
  fetchGroupsSuccess,
  fetchGroupsFailure,
  fetchGroupDetailRequest,
  fetchGroupDetailSuccess,
  fetchGroupContactsRequest,
  fetchGroupContactsSuccess,
  createGroupRequest,
  createGroupSuccess,
  updateGroupRequest,
  updateGroupSuccess,
  deleteGroupRequest,
  deleteGroupSuccess,
  updatePocRequest,
  updatePocSuccess,
  removeClientRequest,
  removeClientSuccess,
  setGroupFilters,
  invalidateGroups,
} = groupSlice.actions;

export default groupSlice.reducer;

