import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store/rootReducer';
import { GroupState } from './groupSlice';

export const selectGroupState = (state: RootState): GroupState => state.groups;

export const selectGroupsList = createSelector(
  [selectGroupState],
  (groups) => groups.items
);

export const selectGroupPagination = createSelector(
  [selectGroupState],
  (groups) => groups.pagination
);

export const selectGroupFilters = createSelector(
  [selectGroupState],
  (groups) => groups.filters
);

export const selectSelectedGroup = createSelector(
  [selectGroupState],
  (groups) => groups.selectedGroup
);

export const selectSelectedGroupContacts = createSelector(
  [selectGroupState],
  (groups) => groups.selectedGroupContacts
);

export const selectGroupLoading = createSelector(
  [selectGroupState],
  (groups) => groups.loading
);

export const selectGroupContactsLoading = createSelector(
  [selectGroupState],
  (groups) => groups.contactsLoading
);

export const selectGroupSubmitting = createSelector(
  [selectGroupState],
  (groups) => groups.submitting
);

export const selectGroupError = createSelector(
  [selectGroupState],
  (groups) => groups.error
);

export const selectIsGroupsStale = createSelector(
  [selectGroupState],
  (groups) => {
    if (!groups.lastFetched) return true;
    const TTL_MS = 5 * 60 * 1000;
    return Date.now() - groups.lastFetched > TTL_MS;
  }
);

