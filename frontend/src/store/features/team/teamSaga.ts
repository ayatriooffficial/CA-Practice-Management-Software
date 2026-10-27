import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { TeamMember } from '@/data/teamData';
import {
  fetchTeamRequest,
  fetchTeamSuccess,
  fetchTeamFailure,
  addTeamMemberRequest,
  addTeamMemberSuccess,
  addTeamMemberFailure,
  updateTeamMemberRequest,
  updateTeamMemberSuccess,
  updateTeamMemberFailure,
  deleteTeamMemberRequest,
  deleteTeamMemberSuccess,
  deleteTeamMemberFailure,
} from './teamSlice';
import { showToast } from '../ui/uiSlice';

function* handleFetchTeam(): Generator<any, void, any> {
  try {
    // Dynamically import teamStore to get members
    const { teamStore } = yield call(() => import('@/components/team/teamStore'));
    const employees = teamStore.getEmployees();
    const members: TeamMember[] = employees.map((emp: any) => ({
      id: emp.id,
      name: emp.name,
      initials: emp.initials || emp.name.slice(0, 2).toUpperCase(),
      email: emp.email,
      phone: emp.mobile,
      role: emp.role,
      position: emp.designation || emp.role,
      department: emp.department || 'General',
      permissions: Object.keys(emp.permissions || {}),
      avatarColor: 'var(--brand-primary)',
      active: emp.status === 'Active',
    }));
    yield put(fetchTeamSuccess(members));
  } catch (error: any) {
    yield put(fetchTeamFailure(error.message || 'Failed to fetch team members'));
  }
}

function* handleAddMember(
  action: PayloadAction<{ data: Partial<TeamMember>; onSuccess?: (member: TeamMember) => void }>
): Generator<any, void, any> {
  try {
    const newMember: TeamMember = {
      id: action.payload.data.id || `team-${Date.now()}`,
      name: action.payload.data.name || 'New Member',
      initials: action.payload.data.initials || 'NM',
      email: action.payload.data.email || '',
      phone: action.payload.data.phone || '',
      role: action.payload.data.role || 'Staff',
      position: action.payload.data.position || 'Staff',
      department: action.payload.data.department || 'General',
      permissions: action.payload.data.permissions || [],
      avatarColor: 'var(--brand-primary)',
      active: action.payload.data.active ?? true,
      ...action.payload.data,
    };
    yield put(addTeamMemberSuccess(newMember));
    yield put(showToast({ type: 'success', message: 'Team member added successfully' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess(newMember);
    }
  } catch (error: any) {
    yield put(addTeamMemberFailure(error.message || 'Failed to add team member'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to add team member' }));
  }
}

function* handleUpdateMember(
  action: PayloadAction<{
    id: string;
    data: Partial<TeamMember>;
    onSuccess?: (member: TeamMember) => void;
  }>
): Generator<any, void, any> {
  try {
    const updatedMember: TeamMember = {
      id: action.payload.id,
      name: action.payload.data.name || '',
      initials: action.payload.data.initials || '',
      email: action.payload.data.email || '',
      role: action.payload.data.role || '',
      position: action.payload.data.position || '',
      department: action.payload.data.department || '',
      permissions: action.payload.data.permissions || [],
      avatarColor: action.payload.data.avatarColor || '',
      active: action.payload.data.active ?? true,
      ...action.payload.data,
    };
    yield put(updateTeamMemberSuccess(updatedMember));
    yield put(showToast({ type: 'success', message: 'Team member updated' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess(updatedMember);
    }
  } catch (error: any) {
    yield put(updateTeamMemberFailure(error.message || 'Failed to update member'));
  }
}

function* handleDeleteMember(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield put(deleteTeamMemberSuccess(action.payload.id));
    yield put(showToast({ type: 'success', message: 'Team member removed' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(deleteTeamMemberFailure(error.message || 'Failed to remove member'));
  }
}

export function* teamSaga() {
  yield takeLatest(fetchTeamRequest.type, handleFetchTeam);
  yield takeLatest(addTeamMemberRequest.type, handleAddMember);
  yield takeLatest(updateTeamMemberRequest.type, handleUpdateMember);
  yield takeLatest(deleteTeamMemberRequest.type, handleDeleteMember);
}
