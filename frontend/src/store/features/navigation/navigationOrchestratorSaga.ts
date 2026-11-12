import { call, put, select, takeLatest, takeEvery, take, fork, cancelled } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import { PayloadAction } from '@reduxjs/toolkit';
import {
  startNavigation,
  cancelNavigation,
  taskCompleted,
  finishNavigation,
  failNavigation,
  invalidateSection,
  NavigationOrchestratorState,
} from './navigationOrchestratorSlice';
import { RootState } from '../../rootReducer';
import { preloadSectionData } from '@/services/sectionPreloadService';
import { navigationProgress } from '@/services/navigationProgress';
import { pageStateCache, getCanonicalSection } from '@/services/pageStateCache';

// Mutation actions that invalidate specific sections
const CLIENT_MUTATION_ACTIONS = [
  'clients/createClientSuccess',
  'clients/updateClientSuccess',
  'clients/deleteClientSuccess',
  'clients/restoreClientSuccess',
];

const TASK_MUTATION_ACTIONS = [
  'tasks/createTaskSuccess',
  'tasks/updateTaskSuccess',
  'tasks/deleteTaskSuccess',
  'tasks/bulkDeleteTasksSuccess',
];

const INVOICE_MUTATION_ACTIONS = [
  'invoices/createInvoiceSuccess',
  'invoices/updateInvoiceSuccess',
  'invoices/deleteInvoiceSuccess',
  'invoices/recordPaymentSuccess',
];

const LEAD_MUTATION_ACTIONS = [
  'leads/createLeadSuccess',
  'leads/updateLeadSuccess',
  'leads/deleteLeadSuccess',
];

const GROUP_MUTATION_ACTIONS = [
  'groups/createGroupSuccess',
  'groups/updateGroupSuccess',
  'groups/deleteGroupSuccess',
];

function* handleClientMutation(): Generator<any, void, any> {
  yield put(invalidateSection({ section: 'client' }));
  yield put(invalidateSection({ section: 'home' }));
}

function* handleTaskMutation(): Generator<any, void, any> {
  yield put(invalidateSection({ section: 'task' }));
  yield put(invalidateSection({ section: 'home' }));
}

function* handleInvoiceMutation(): Generator<any, void, any> {
  yield put(invalidateSection({ section: 'invoice' }));
  yield put(invalidateSection({ section: 'home' }));
}

function* handleLeadMutation(): Generator<any, void, any> {
  yield put(invalidateSection({ section: 'leads' }));
  yield put(invalidateSection({ section: 'home' }));
}

function* handleGroupMutation(): Generator<any, void, any> {
  yield put(invalidateSection({ section: 'groups' }));
}

// Task 4: Central interruptible navigation task handler
// takeLatest automatically cancels any running navigation task when a new navigation action arrives
function* handleNavigationCycle(
  action: PayloadAction<{ targetSection: string; tasks?: string[]; immediate?: boolean }>
): Generator<any, void, any> {
  const { targetSection } = action.payload;
  try {
    yield call(preloadSectionData, targetSection);
    yield put(finishNavigation({ targetSection }));
  } catch (err: any) {
    // If not a silent cancellation, fail gracefully without getting stuck
    yield put(failNavigation({ targetSection, error: err?.message || 'Navigation failed' }));
  } finally {
    if (yield cancelled()) {
      // Interrupted by a newer click: silent cancellation
    }
  }
}

// Realtime SSE Event Channel connecting to Redis Pub/Sub backend
function createRealtimeEventChannel() {
  return eventChannel((emitter) => {
    if (typeof window === 'undefined' || !window.EventSource) {
      return () => {};
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`${apiUrl}/sync/events`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.entity) {
            emitter(data);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        // Browser EventSource automatically reconnects
      };
    } catch {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  });
}

function* watchRealtimeServerEvents(): Generator<any, void, any> {
  try {
    const channel: any = yield call(createRealtimeEventChannel);
    while (true) {
      const event: { entity: string; action: string } = yield take(channel);
      if (event?.entity) {
        yield put(invalidateSection({ section: event.entity }));
      }
    }
  } catch (err) {
    // Graceful recovery
  }
}

export function* navigationOrchestratorSaga() {
  // Interruptible navigation orchestrator: latest navigation action cancels in-flight task
  yield takeLatest(startNavigation.type, handleNavigationCycle);

  // Real-time server-side Redis invalidation stream
  yield fork(watchRealtimeServerEvents);

  // Listen to data mutations across all slices to trigger precise section invalidation
  yield takeEvery(CLIENT_MUTATION_ACTIONS, handleClientMutation);
  yield takeEvery(TASK_MUTATION_ACTIONS, handleTaskMutation);
  yield takeEvery(INVOICE_MUTATION_ACTIONS, handleInvoiceMutation);
  yield takeEvery(LEAD_MUTATION_ACTIONS, handleLeadMutation);
  yield takeEvery(GROUP_MUTATION_ACTIONS, handleGroupMutation);
}

