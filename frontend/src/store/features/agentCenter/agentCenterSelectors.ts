import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../rootReducer';
import { Agent, AgentModule } from '@/types/agentCenter';

export const selectAgentCenterState = (state: RootState) => state.agentCenter;

export const selectAllAgents = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.agents
);

export const selectSelectedAgent = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.selectedAgent
);

export const selectAgentFilters = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.filters
);

export const selectAgentPagination = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.pagination
);

export const selectAgentLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.loading
);

export const selectAgentMutating = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.mutating
);

export const selectAgentError = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.error
);

export const selectAgentDefinitions = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.definitions
);

export const selectAgentDefinitionsLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.definitionsLoading
);

export const selectAgentIntegrations = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.integrations
);

export const selectAgentIntegrationsLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.integrationsLoading
);

export const selectAgentHistory = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.history
);

export const selectAgentDetailHistory = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.agentHistory
);

export const selectAgentHistoryLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.historyLoading
);

export const selectAgentDiagnostics = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.diagnostics
);

export const selectAgentDiagnosticsLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.diagnosticsLoading
);

export const selectAgentFollowUps = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.followUps
);

export const selectAgentFollowUpsLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.followUpsLoading
);

export const selectAgentImpactPreview = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.impactPreview
);

export const selectAgentImpactPreviewLoading = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.impactPreviewLoading
);

export const selectIsAgentCenterLoaded = createSelector(
  [selectAgentCenterState],
  (agentCenter) => agentCenter.isLoaded
);

/**
 * Derived selector for module counts:
 * All, Task, DSC, License
 */
export const selectCountsByModule = createSelector(
  [selectAllAgents],
  (agents: Agent[]) => {
    const counts: Record<AgentModule | 'All', number> = {
      All: agents.length,
      Task: 0,
      DSC: 0,
      License: 0,
    };

    for (const agent of agents) {
      if (agent.module === 'Task') counts.Task += 1;
      else if (agent.module === 'DSC') counts.DSC += 1;
      else if (agent.module === 'License') counts.License += 1;
    }

    return counts;
  }
);

/**
 * Derived selector for filtered agents list
 */
export const selectFilteredAgents = createSelector(
  [selectAllAgents, selectAgentFilters],
  (agents: Agent[], filters) => {
    let result = [...agents];

    // Filter by module
    if (filters.module && filters.module !== 'All') {
      result = result.filter((a) => a.module === filters.module);
    }

    // Filter by status
    if (filters.status && filters.status !== 'All') {
      result = result.filter((a) => a.status === filters.status);
    }

    // Filter by search
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          (typeof a.config?.trigger === 'string' && a.config.trigger.toLowerCase().includes(q)) ||
          ((a as any).systemKey && (a as any).systemKey.toLowerCase().includes(q))
      );
    }

    return result;
  }
);

/**
 * Derived selector for paginated agents
 */
export const selectPaginatedAgents = createSelector(
  [selectFilteredAgents, selectAgentPagination],
  (filteredAgents, pagination) => {
    const { page, limit } = pagination;
    const startIndex = (page - 1) * limit;
    return filteredAgents.slice(startIndex, startIndex + limit);
  }
);
