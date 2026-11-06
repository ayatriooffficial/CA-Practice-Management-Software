import { call, put, select, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import {
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
} from './groupSlice';
import { selectGroupFilters, selectIsGroupsStale } from './groupSelectors';
import { groupApi, GroupListResponse, GroupRecord } from '@/services/groupApi';
import { showToast } from '../ui/uiSlice';

function* handleFetchGroups(
  action: PayloadAction<{ force?: boolean; params?: any } | undefined>
): Generator<any, void, any> {
  try {
    const isStale: boolean = yield select(selectIsGroupsStale);
    const force = action.payload?.force;

    // Cache hit: If fresh and not forced, skip network call
    if (!isStale && !force && !action.payload?.params) {
      return;
    }

    const filters = yield select(selectGroupFilters);
    const res: GroupListResponse = yield call([groupApi, groupApi.listGroups], filters);

    yield put(
      fetchGroupsSuccess({
        items: res.data || [],
        pagination: res.pagination || { page: 1, limit: 25, totalDocs: 0, totalPages: 1 },
      })
    );
  } catch (err: any) {
    yield put(fetchGroupsFailure(err.message || 'Failed to load groups'));
    yield put(showToast({ message: err.message || 'Failed to load groups', type: 'error' }));
  }
}

function* handleFetchGroupDetail(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const res: { success: boolean; data: GroupRecord } = yield call(
      [groupApi, groupApi.getGroupById],
      action.payload
    );
    yield put(fetchGroupDetailSuccess(res.data));
  } catch (err: any) {
    yield put(fetchGroupsFailure(err.message || 'Failed to load group detail'));
    yield put(showToast({ message: err.message || 'Failed to load group detail', type: 'error' }));
  }
}

function* handleFetchGroupContacts(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const res: { success: boolean; data: any[] } = yield call(
      [groupApi, groupApi.getGroupContacts],
      action.payload
    );
    yield put(fetchGroupContactsSuccess(res.data || []));
  } catch (err: any) {
    yield put(showToast({ message: err.message || 'Failed to load group contacts', type: 'error' }));
  }
}

function* handleCreateGroup(
  action: PayloadAction<{ data: any; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    const res: { success: boolean; data: GroupRecord } = yield call(
      [groupApi, groupApi.createGroup],
      action.payload.data
    );
    yield put(createGroupSuccess(res.data));
    yield put(showToast({ message: `Group "${res.data.name}" created successfully`, type: 'success' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (err: any) {
    yield put(fetchGroupsFailure(err.message || 'Failed to create group'));
    yield put(showToast({ message: err.message || 'Failed to create group', type: 'error' }));
  }
}

function* handleUpdateGroup(
  action: PayloadAction<{ id: string; data: any; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    const res: { success: boolean; data: GroupRecord } = yield call(
      [groupApi, groupApi.updateGroup],
      action.payload.id,
      action.payload.data
    );
    yield put(updateGroupSuccess(res.data));
    yield put(showToast({ message: `Group "${res.data.name}" updated successfully`, type: 'success' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (err: any) {
    yield put(fetchGroupsFailure(err.message || 'Failed to update group'));
    yield put(showToast({ message: err.message || 'Failed to update group', type: 'error' }));
  }
}

function* handleDeleteGroup(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield call([groupApi, groupApi.deleteGroup], action.payload.id);
    yield put(deleteGroupSuccess(action.payload.id));
    yield put(showToast({ message: 'Group deleted successfully', type: 'success' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (err: any) {
    yield put(showToast({ message: err.message || 'Failed to delete group', type: 'error' }));
  }
}

function* handleUpdatePoc(
  action: PayloadAction<{ groupId: string; pocClientId: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    const res: { success: boolean; data: GroupRecord } = yield call(
      [groupApi, groupApi.updateGroupPoc],
      action.payload.groupId,
      action.payload.pocClientId
    );
    yield put(updatePocSuccess(res.data));
    yield put(showToast({ message: 'Point of Contact updated successfully', type: 'success' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (err: any) {
    yield put(showToast({ message: err.message || 'Failed to update POC', type: 'error' }));
  }
}

function* handleRemoveClient(
  action: PayloadAction<{ groupId: string; clientId: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    const res: { success: boolean; data: GroupRecord } = yield call(
      [groupApi, groupApi.removeClientFromGroup],
      action.payload.groupId,
      action.payload.clientId
    );
    yield put(removeClientSuccess(res.data));
    yield put(showToast({ message: 'Client removed from group', type: 'info' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (err: any) {
    yield put(showToast({ message: err.message || 'Failed to remove client', type: 'error' }));
  }
}

export function* groupSaga() {
  yield takeLatest(fetchGroupsRequest.type, handleFetchGroups);
  yield takeLatest(fetchGroupDetailRequest.type, handleFetchGroupDetail);
  yield takeLatest(fetchGroupContactsRequest.type, handleFetchGroupContacts);
  yield takeLatest(createGroupRequest.type, handleCreateGroup);
  yield takeLatest(updateGroupRequest.type, handleUpdateGroup);
  yield takeLatest(deleteGroupRequest.type, handleDeleteGroup);
  yield takeLatest(updatePocRequest.type, handleUpdatePoc);
  yield takeLatest(removeClientRequest.type, handleRemoveClient);
}

