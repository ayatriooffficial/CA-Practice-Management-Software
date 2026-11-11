import { call, put, takeLatest, takeLeading, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { agentCenterApi } from '@/services/agentCenterApi';
import {
  Agent,
  AgentConfigDraft,
  AgentDefinitions,
  AgentDiagnosticSummary,
  AgentFilters,
  AgentImpactPreview,
  AgentModule,
  AgentRun,
  FollowUpRecord,
} from '@/types/agentCenter';
import {
  fetchAgentsRequest,
  fetchAgentsSuccess,
  fetchAgentsFailure,
  fetchAgentByIdRequest,
  fetchAgentByIdSuccess,
  fetchAgentByIdFailure,
  createAgentRequest,
  createAgentSuccess,
  createAgentFailure,
  updateAgentRequest,
  updateAgentSuccess,
  updateAgentFailure,
  publishAgentRequest,
  publishAgentSuccess,
  publishAgentFailure,
  disableAgentRequest,
  disableAgentSuccess,
  disableAgentFailure,
  deleteAgentRequest,
  deleteAgentSuccess,
  deleteAgentFailure,
  testRunAgentRequest,
  testRunAgentSuccess,
  testRunAgentFailure,
  fetchDefinitionsRequest,
  fetchDefinitionsSuccess,
  fetchDefinitionsFailure,
  fetchIntegrationsStatusRequest,
  fetchIntegrationsStatusSuccess,
  fetchIntegrationsStatusFailure,
  fetchHistoryRequest,
  fetchHistorySuccess,
  fetchHistoryFailure,
  fetchAgentHistoryRequest,
  fetchAgentHistorySuccess,
  fetchAgentHistoryFailure,
  fetchDiagnosticsRequest,
  fetchDiagnosticsSuccess,
  fetchDiagnosticsFailure,
  fetchFollowUpsRequest,
  fetchFollowUpsSuccess,
  fetchFollowUpsFailure,
  previewAgentImpactRequest,
  previewAgentImpactSuccess,
  previewAgentImpactFailure,
} from './agentCenterSlice';
import { showToast } from '../ui/uiSlice';
import { pageStateCache } from '@/services/pageStateCache';

// ==============================================================================
// Read Handlers (takeLatest ensures newest request cancels any in-flight stale one)
// ==============================================================================

function* handleFetchAgents(
  action: PayloadAction<(AgentFilters & { page?: number; limit?: number }) | undefined>
): Generator<any, void, any> {
  try {
    const filters = action.payload || {};
    const agents: Agent[] = yield call(agentCenterApi.listAgents, filters);
    yield put(
      fetchAgentsSuccess({
        agents,
        filters,
      })
    );
    if (!action.payload || (filters.module === 'All' && !filters.search)) {
      pageStateCache.set('agent_center_list_data', { agents });
      pageStateCache.markLoaded('/agents');
    }
  } catch (err: any) {
    yield put(fetchAgentsFailure(err?.message || 'Failed to fetch agents'));
  }
}

function* handleFetchAgentById(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const agent: Agent = yield call(agentCenterApi.getAgent, action.payload);
    yield put(fetchAgentByIdSuccess(agent));
  } catch (err: any) {
    yield put(fetchAgentByIdFailure(err?.message || 'Failed to load agent details'));
    yield put(showToast({ type: 'error', message: err?.message || 'Failed to load agent details' }));
  }
}

function* handleFetchDefinitions(): Generator<any, void, any> {
  try {
    const defs: AgentDefinitions = yield call(agentCenterApi.getDefinitions);
    yield put(fetchDefinitionsSuccess(defs));
  } catch (err: any) {
    yield put(fetchDefinitionsFailure());
  }
}

function* handleFetchIntegrations(): Generator<any, void, any> {
  try {
    const status: any = yield call(agentCenterApi.getIntegrationsStatus);
    yield put(fetchIntegrationsStatusSuccess(status));
  } catch (err: any) {
    yield put(fetchIntegrationsStatusFailure());
  }
}

function* handleFetchHistory(action: PayloadAction<number | undefined>): Generator<any, void, any> {
  try {
    const history: AgentRun[] = yield call(agentCenterApi.getHistory, action.payload || 100);
    yield put(fetchHistorySuccess(history));
  } catch (err: any) {
    yield put(fetchHistoryFailure(err?.message || 'Failed to load execution history'));
  }
}

function* handleFetchAgentHistory(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const runs: AgentRun[] = yield call(agentCenterApi.getAgentHistory, action.payload);
    yield put(fetchAgentHistorySuccess(runs));
  } catch (err: any) {
    yield put(fetchAgentHistoryFailure(err?.message || 'Failed to load agent history'));
  }
}

function* handleFetchDiagnostics(): Generator<any, void, any> {
  try {
    const summary: AgentDiagnosticSummary = yield call(agentCenterApi.getDiagnosticSummary);
    yield put(fetchDiagnosticsSuccess(summary));
  } catch (err: any) {
    yield put(fetchDiagnosticsFailure());
  }
}

function* handleFetchFollowUps(action: PayloadAction<string | undefined>): Generator<any, void, any> {
  try {
    const followUps: FollowUpRecord[] = yield call(agentCenterApi.listFollowUps, action.payload);
    yield put(fetchFollowUpsSuccess(followUps));
  } catch (err: any) {
    yield put(fetchFollowUpsFailure());
  }
}

function* handlePreviewAgentImpact(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const preview: AgentImpactPreview = yield call(agentCenterApi.previewAgentImpact, action.payload);
    yield put(previewAgentImpactSuccess(preview));
  } catch (err: any) {
    yield put(previewAgentImpactFailure());
  }
}

// ==============================================================================
// Mutation Handlers (takeLeading prevents duplicate clicks / race conditions)
// ==============================================================================

function* handleCreateAgent(
  action: PayloadAction<{
    name: string;
    module: AgentModule;
    description: string;
    config: AgentConfigDraft;
    saveDraft?: boolean;
    onSuccess?: (agent: Agent) => void;
  }>
): Generator<any, void, any> {
  try {
    const { onSuccess, ...payload } = action.payload;
    const created: Agent = yield call(agentCenterApi.createAgent, payload);
    yield put(createAgentSuccess(created));
    yield put(showToast({ type: 'success', message: `“${created.name}” saved as draft.` }));
    yield put(fetchAgentsRequest({ module: created.module }));
    if (onSuccess) {
      onSuccess(created);
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to create agent';
    yield put(createAgentFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleUpdateAgent(
  action: PayloadAction<{
    id: string;
    payload: Partial<{
      name: string;
      module: AgentModule;
      description: string;
      config: AgentConfigDraft;
      saveDraft: boolean;
    }>;
    onSuccess?: (agent: Agent) => void;
  }>
): Generator<any, void, any> {
  try {
    const { id, payload, onSuccess } = action.payload;
    const updated: Agent = yield call(agentCenterApi.updateAgent, id, payload);
    yield put(updateAgentSuccess(updated));
    yield put(showToast({ type: 'success', message: `“${updated.name}” updated successfully.` }));
    if (onSuccess) {
      onSuccess(updated);
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to update agent';
    yield put(updateAgentFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handlePublishAgent(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const published: Agent = yield call(agentCenterApi.publishAgent, action.payload);
    yield put(publishAgentSuccess(published));
    yield put(showToast({ type: 'success', message: `“${published.name}” is now active and published.` }));
    yield put(fetchAgentsRequest());
  } catch (err: any) {
    const msg = err?.message || 'Failed to publish agent';
    yield put(publishAgentFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleDisableAgent(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const disabled: Agent = yield call(agentCenterApi.disableAgent, action.payload);
    yield put(disableAgentSuccess(disabled));
    yield put(showToast({ type: 'success', message: `“${disabled.name}” is now disabled.` }));
    yield put(fetchAgentsRequest());
  } catch (err: any) {
    const msg = err?.message || 'Failed to disable agent';
    yield put(disableAgentFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleDeleteAgent(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    yield call(agentCenterApi.deleteAgent, action.payload);
    yield put(deleteAgentSuccess(action.payload));
    yield put(showToast({ type: 'success', message: 'Draft agent deleted successfully.' }));
  } catch (err: any) {
    const msg = err?.message || 'Failed to delete agent';
    yield put(deleteAgentFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

function* handleTestRunAgent(
  action: PayloadAction<{
    id: string;
    options?: { testEmail?: string; mode?: 'test' | 'live'; failRecipient?: string; messageId?: string };
    onSuccess?: (run: AgentRun) => void;
  }>
): Generator<any, void, any> {
  try {
    const { id, options, onSuccess } = action.payload;
    const run: AgentRun = yield call(agentCenterApi.testRunAgent, id, options);
    yield put(testRunAgentSuccess(run));
    if (run.status === 'failed') {
      yield put(showToast({ type: 'error', message: `Test run failed: ${run.errorMessage || 'Execution error'}` }));
    } else {
      yield put(showToast({ type: 'info', message: 'Test execution recorded.' }));
    }
    yield put(fetchAgentHistoryRequest(id));
    if (onSuccess) {
      onSuccess(run);
    }
  } catch (err: any) {
    const msg = err?.message || 'Test run failed';
    yield put(testRunAgentFailure(msg));
    yield put(showToast({ type: 'error', message: msg }));
  }
}

// ==============================================================================
// Root Feature Saga Watcher
// ==============================================================================

export function* agentCenterSaga() {
  yield all([
    // Reads
    takeLatest(fetchAgentsRequest.type, handleFetchAgents),
    takeLatest(fetchAgentByIdRequest.type, handleFetchAgentById),
    takeLatest(fetchDefinitionsRequest.type, handleFetchDefinitions),
    takeLatest(fetchIntegrationsStatusRequest.type, handleFetchIntegrations),
    takeLatest(fetchHistoryRequest.type, handleFetchHistory),
    takeLatest(fetchAgentHistoryRequest.type, handleFetchAgentHistory),
    takeLatest(fetchDiagnosticsRequest.type, handleFetchDiagnostics),
    takeLatest(fetchFollowUpsRequest.type, handleFetchFollowUps),
    takeLatest(previewAgentImpactRequest.type, handlePreviewAgentImpact),

    // Mutations
    takeLeading(createAgentRequest.type, handleCreateAgent),
    takeLeading(updateAgentRequest.type, handleUpdateAgent),
    takeLeading(publishAgentRequest.type, handlePublishAgent),
    takeLeading(disableAgentRequest.type, handleDisableAgent),
    takeLeading(deleteAgentRequest.type, handleDeleteAgent),
    takeLeading(testRunAgentRequest.type, handleTestRunAgent),
  ]);
}
