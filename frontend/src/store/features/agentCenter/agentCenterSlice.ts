import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
import { PaginationState } from '../clients/clientSlice';
import { pageStateCache } from '@/services/pageStateCache';

export interface AgentCenterState {
  // Agents List
  agents: Agent[];
  selectedAgent: Agent | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  pagination: PaginationState;
  filters: AgentFilters;

  // Definitions & Integrations
  definitions: AgentDefinitions | null;
  definitionsLoading: boolean;
  integrations: {
    email: {
      configured: boolean;
      statusText: string;
      provider?: 'gmail' | 'smtp' | 'none';
      email?: string | null;
      needsReconnect?: boolean;
      error?: string;
    };
    whatsapp: {
      configured: boolean;
      statusText: string;
    };
  } | null;
  integrationsLoading: boolean;

  // Execution History
  history: AgentRun[];
  agentHistory: AgentRun[];
  historyLoading: boolean;
  historyError: string | null;
  historyPagination: PaginationState;

  // Automation Diagnostics & Follow-ups
  diagnostics: AgentDiagnosticSummary | null;
  diagnosticsLoading: boolean;
  followUps: FollowUpRecord[];
  followUpsLoading: boolean;
  impactPreview: AgentImpactPreview | null;
  impactPreviewLoading: boolean;

  isLoaded: boolean;
}

const getInitialAgentCenterState = (): AgentCenterState => {
  const cached = typeof window !== 'undefined' ? pageStateCache.get<any>('agent_center_list_data') : null;
  return {
    agents: cached?.agents || [],
    selectedAgent: null,
    loading: false,
    mutating: false,
    error: null,
    pagination: cached?.pagination || {
      page: 1,
      limit: 50,
      totalDocs: cached?.agents?.length || 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    filters: {
      module: 'All',
      status: 'All',
      search: '',
    },
    definitions: null,
    definitionsLoading: false,
    integrations: null,
    integrationsLoading: false,
    history: [],
    agentHistory: [],
    historyLoading: false,
    historyError: null,
    historyPagination: {
      page: 1,
      limit: 100,
      totalDocs: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    diagnostics: null,
    diagnosticsLoading: false,
    followUps: [],
    followUpsLoading: false,
    impactPreview: null,
    impactPreviewLoading: false,
    isLoaded: Boolean(cached?.agents?.length),
  };
};

const initialState: AgentCenterState = getInitialAgentCenterState();

export const agentCenterSlice = createSlice({
  name: 'agentCenter',
  initialState,
  reducers: {
    // Agents List Actions
    fetchAgentsRequest: (state, _action: PayloadAction<(AgentFilters & { page?: number; limit?: number }) | undefined>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAgentsSuccess: (
      state,
      action: PayloadAction<{ agents: Agent[]; pagination?: PaginationState; filters?: AgentFilters }>
    ) => {
      state.agents = action.payload.agents;
      state.loading = false;
      state.isLoaded = true;
      state.error = null;
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      } else {
        state.pagination.totalDocs = action.payload.agents.length;
        state.pagination.totalPages = Math.max(1, Math.ceil(action.payload.agents.length / state.pagination.limit));
      }
      if (action.payload.filters) {
        state.filters = { ...state.filters, ...action.payload.filters };
      }
    },
    fetchAgentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setAgentFilters: (state, action: PayloadAction<Partial<AgentFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setAgentPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setAgentLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },

    // Agent Details Actions
    fetchAgentByIdRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAgentByIdSuccess: (state, action: PayloadAction<Agent>) => {
      state.selectedAgent = action.payload;
      state.loading = false;
      state.error = null;
      const index = state.agents.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) {
        state.agents[index] = action.payload;
      }
    },
    fetchAgentByIdFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Create Agent Actions
    createAgentRequest: (
      state,
      _action: PayloadAction<{
        name: string;
        module: AgentModule;
        description: string;
        config: AgentConfigDraft;
        saveDraft?: boolean;
        onSuccess?: (agent: Agent) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    createAgentSuccess: (state, action: PayloadAction<Agent>) => {
      state.mutating = false;
      state.agents.unshift(action.payload);
      state.pagination.totalDocs += 1;
    },
    createAgentFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Update Agent Actions
    updateAgentRequest: (
      state,
      _action: PayloadAction<{
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
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateAgentSuccess: (state, action: PayloadAction<Agent>) => {
      state.mutating = false;
      state.selectedAgent = action.payload;
      const index = state.agents.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) {
        state.agents[index] = action.payload;
      }
    },
    updateAgentFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Publish Agent Actions
    publishAgentRequest: (state, _action: PayloadAction<string>) => {
      state.mutating = true;
      state.error = null;
    },
    publishAgentSuccess: (state, action: PayloadAction<Agent>) => {
      state.mutating = false;
      state.selectedAgent = action.payload;
      const index = state.agents.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) {
        state.agents[index] = action.payload;
      }
    },
    publishAgentFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Disable Agent Actions
    disableAgentRequest: (state, _action: PayloadAction<string>) => {
      state.mutating = true;
      state.error = null;
    },
    disableAgentSuccess: (state, action: PayloadAction<Agent>) => {
      state.mutating = false;
      state.selectedAgent = action.payload;
      const index = state.agents.findIndex((a) => a.id === action.payload.id);
      if (index >= 0) {
        state.agents[index] = action.payload;
      }
    },
    disableAgentFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Delete Draft Agent Actions
    deleteAgentRequest: (state, _action: PayloadAction<string>) => {
      state.mutating = true;
      state.error = null;
    },
    deleteAgentSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.agents = state.agents.filter((a) => a.id !== action.payload);
      state.pagination.totalDocs = Math.max(0, state.pagination.totalDocs - 1);
      if (state.selectedAgent?.id === action.payload) {
        state.selectedAgent = null;
      }
    },
    deleteAgentFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Test Run Actions
    testRunAgentRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        options?: { testEmail?: string; mode?: 'test' | 'live'; failRecipient?: string; messageId?: string };
        onSuccess?: (run: AgentRun) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    testRunAgentSuccess: (state, action: PayloadAction<AgentRun>) => {
      state.mutating = false;
      state.agentHistory.unshift(action.payload);
      state.history.unshift(action.payload);
    },
    testRunAgentFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    // Definitions Actions
    fetchDefinitionsRequest: (state) => {
      state.definitionsLoading = true;
    },
    fetchDefinitionsSuccess: (state, action: PayloadAction<AgentDefinitions>) => {
      state.definitions = action.payload;
      state.definitionsLoading = false;
    },
    fetchDefinitionsFailure: (state) => {
      state.definitionsLoading = false;
    },

    // Integrations Status Actions
    fetchIntegrationsStatusRequest: (state) => {
      state.integrationsLoading = true;
    },
    fetchIntegrationsStatusSuccess: (state, action: PayloadAction<any>) => {
      state.integrations = action.payload;
      state.integrationsLoading = false;
    },
    fetchIntegrationsStatusFailure: (state) => {
      state.integrationsLoading = false;
    },

    // Global History Actions
    fetchHistoryRequest: (state, _action: PayloadAction<number | undefined>) => {
      state.historyLoading = true;
      state.historyError = null;
    },
    fetchHistorySuccess: (state, action: PayloadAction<AgentRun[]>) => {
      state.history = action.payload;
      state.historyLoading = false;
      state.historyPagination.totalDocs = action.payload.length;
    },
    fetchHistoryFailure: (state, action: PayloadAction<string>) => {
      state.historyLoading = false;
      state.historyError = action.payload;
    },

    // Agent Specific History Actions
    fetchAgentHistoryRequest: (state, _action: PayloadAction<string>) => {
      state.historyLoading = true;
      state.historyError = null;
    },
    fetchAgentHistorySuccess: (state, action: PayloadAction<AgentRun[]>) => {
      state.agentHistory = action.payload;
      state.historyLoading = false;
    },
    fetchAgentHistoryFailure: (state, action: PayloadAction<string>) => {
      state.historyLoading = false;
      state.historyError = action.payload;
    },

    // Diagnostics Summary Actions
    fetchDiagnosticsRequest: (state) => {
      state.diagnosticsLoading = true;
    },
    fetchDiagnosticsSuccess: (state, action: PayloadAction<AgentDiagnosticSummary>) => {
      state.diagnostics = action.payload;
      state.diagnosticsLoading = false;
    },
    fetchDiagnosticsFailure: (state) => {
      state.diagnosticsLoading = false;
    },

    // Follow-ups Actions
    fetchFollowUpsRequest: (state, _action: PayloadAction<string | undefined>) => {
      state.followUpsLoading = true;
    },
    fetchFollowUpsSuccess: (state, action: PayloadAction<FollowUpRecord[]>) => {
      state.followUps = action.payload;
      state.followUpsLoading = false;
    },
    fetchFollowUpsFailure: (state) => {
      state.followUpsLoading = false;
    },

    // Impact Preview Actions
    previewAgentImpactRequest: (state, _action: PayloadAction<string>) => {
      state.impactPreviewLoading = true;
    },
    previewAgentImpactSuccess: (state, action: PayloadAction<AgentImpactPreview>) => {
      state.impactPreview = action.payload;
      state.impactPreviewLoading = false;
    },
    previewAgentImpactFailure: (state) => {
      state.impactPreviewLoading = false;
    },
  },
});

export const {
  fetchAgentsRequest,
  fetchAgentsSuccess,
  fetchAgentsFailure,
  setAgentFilters,
  setAgentPage,
  setAgentLimit,
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
} = agentCenterSlice.actions;

export default agentCenterSlice.reducer;
