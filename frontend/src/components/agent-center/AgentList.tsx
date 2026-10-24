'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  HelpCircle,
  KeyRound,
  Mail,
  MessageCircle,
  MinusCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  useAgents,
  useAgentGlobalHistory,
  useDisableAgent,
  usePublishAgent,
  useTestRunAgent,
} from '@/hooks/useAgentCenterQuery';
import { Agent, AgentModule, AgentRun, AgentStatus } from '@/types/agentCenter';
import { formatAgentDate } from './shared';

interface ModuleCardConfig {
  name: AgentModule;
  description: string;
  icon: React.ReactNode;
}

const MODULE_DEFINITIONS: ModuleCardConfig[] = [
  {
    name: 'Task',
    description: 'Agents for task creation, assignment notifications, and reminders.',
    icon: <CheckSquare className="h-5 w-5 text-indigo-600" />,
  },
  {
    name: 'DSC',
    description: 'Notifications for DSC creation, renewal, and upcoming expiry reminders.',
    icon: <KeyRound className="h-5 w-5 text-rose-600" />,
  },
  {
    name: 'License',
    description: 'Automated alerts for license application, renewal, and expiry dates.',
    icon: <Award className="h-5 w-5 text-cyan-600" />,
  },
];

export default function AgentList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryModule = searchParams.get('module') as AgentModule | null;
  const queryTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'modules' | 'history'>(
    queryTab === 'history' ? 'history' : 'modules'
  );
  const [selectedModule, setSelectedModule] = useState<AgentModule | null>(
    queryModule === 'Task' || queryModule === 'DSC' || queryModule === 'License'
      ? queryModule
      : null
  );

  useEffect(() => {
    if (queryModule === 'Task' || queryModule === 'DSC' || queryModule === 'License') {
      setSelectedModule(queryModule);
      setActiveTab('modules');
    }
  }, [queryModule]);

  useEffect(() => {
    if (queryTab === 'history') {
      setActiveTab('history');
      setSelectedModule(null);
    }
  }, [queryTab]);

  const { data: liveAgents = [], isLoading: agentsLoading, refetch: refetchAgents, isFetching: agentsFetching } = useAgents({}, true);
  const { data: liveHistory = [], isLoading: historyLoading, refetch: refetchHistory, isFetching: historyFetching } = useAgentGlobalHistory(200);

  const publish = usePublishAgent();
  const disable = useDisableAgent();
  const testRun = useTestRunAgent();

  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyModuleFilter, setHistoryModuleFilter] = useState<'All' | AgentModule>('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | string>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const countsByModule = useMemo(() => {
    const counts: Record<AgentModule, { total: number; active: number }> = {
      Task: { total: 0, active: 0 },
      DSC: { total: 0, active: 0 },
      License: { total: 0, active: 0 },
    };
    for (const agent of liveAgents) {
      if (counts[agent.module]) {
        counts[agent.module].total += 1;
        if (agent.status === 'published') {
          counts[agent.module].active += 1;
        }
      }
    }
    return counts;
  }, [liveAgents]);

  const moduleAgents = useMemo(() => {
    if (!selectedModule) return [];
    const q = search.trim().toLowerCase();
    return liveAgents.filter((agent) => {
      if (agent.module !== selectedModule) return false;
      if (!q) return true;
      const trigger = String(agent.config?.trigger || '').toLowerCase();
      const name = agent.name.toLowerCase();
      const channel = String(agent.config?.channel || '').toLowerCase();
      return name.includes(q) || trigger.includes(q) || channel.includes(q);
    });
  }, [liveAgents, selectedModule, search]);

  const historyMetrics = useMemo(() => {
    const total = liveHistory.length;
    let successful = 0;
    let partial = 0;
    let failed = 0;
    let skipped = 0;

    for (const run of liveHistory) {
      if (run.status === 'success') successful += 1;
      else if (run.status === 'partial-failed') partial += 1;
      else if (run.status === 'failed') failed += 1;
      else if (run.status === 'skipped') skipped += 1;
      else if (run.status === 'draft') skipped += 1;
    }
    return { total, successful, partial, failed, skipped };
  }, [liveHistory]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return liveHistory.filter((item) => {
      if (historyModuleFilter !== 'All' && item.agentModule !== historyModuleFilter) return false;
      if (historyStatusFilter !== 'All' && item.status !== historyStatusFilter) return false;
      if (!q) return true;
      const agentName = (item.agentName || '').toLowerCase();
      const client = String(item.triggerData?.clientName || item.result?.label || '').toLowerCase();
      const trigger = String(item.triggerData?.trigger || item.result?.trigger || '').toLowerCase();
      const msg = String(item.result?.message || item.errorMessage || '').toLowerCase();
      return agentName.includes(q) || client.includes(q) || trigger.includes(q) || msg.includes(q);
    });
  }, [liveHistory, historySearch, historyModuleFilter, historyStatusFilter]);

  async function handleToggleStatus(agent: Agent) {
    setBusyId(agent.id);
    setNotice(null);
    try {
      if (agent.status === 'published') {
        await disable.mutateAsync(agent.id);
        setNotice({ type: 'success', text: `“${agent.name}” is now disabled.` });
      } else {
        await publish.mutateAsync(agent.id);
        setNotice({ type: 'success', text: `“${agent.name}” is now active and published.` });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Status update failed.' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleTestRun(agent: Agent) {
    setBusyId(agent.id);
    setNotice(null);
    try {
      const run = await testRun.mutateAsync(agent.id);
      if (run.status === 'failed') {
        setNotice({
          type: 'error',
          text: `Test run failed: ${run.errorMessage || 'Execution encountered an error.'}`,
        });
      } else {
        setNotice({
          type: 'info',
          text: `Test execution recorded for “${agent.name}”. (Simulated preview · no live notification dispatched)`,
        });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Test run failed.' });
    } finally {
      setBusyId(null);
    }
  }

  const navigateToModule = (mod: AgentModule) => {
    setSelectedModule(mod);
    setActiveTab('modules');
    router.push(`/agents?module=${mod}`);
  };

  const navigateBackToModules = () => {
    setSelectedModule(null);
    setSearch('');
    router.push('/agents');
  };

  const handleTabChange = (tab: 'modules' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') {
      setSelectedModule(null);
      router.push('/agents?tab=history');
    } else {
      router.push('/agents');
    }
  };

  return (
    <div className="w-full px-6 py-6 md:px-8 select-none">
      {/* 1. TOP HEADER & TABS (When on Overview or History) */}
      {!selectedModule && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED] text-white shadow-sm">
              <Zap className="h-5 w-5 fill-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Agent Center</h1>
              <p className="text-xs md:text-sm text-slate-500">Set up automated notifications for your team</p>
            </div>
          </div>

          {/* Tab Navigation & Search */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 gap-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => handleTabChange('modules')}
                className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                  activeTab === 'modules'
                    ? 'border-[#7C3AED] text-[#7C3AED]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Modules
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('history')}
                className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                  activeTab === 'history'
                    ? 'border-[#7C3AED] text-[#7C3AED]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Agent History
              </button>
            </div>

            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by module, trigger or channel..."
                  value={activeTab === 'modules' ? search : historySearch}
                  onChange={(e) => (activeTab === 'modules' ? setSearch(e.target.value) : setHistorySearch(e.target.value))}
                  className="w-64 md:w-80 rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs md:text-sm outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              <button
                type="button"
                onClick={() => (activeTab === 'modules' ? void refetchAgents() : void refetchHistory())}
                disabled={agentsFetching || historyFetching}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${agentsFetching || historyFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Banner */}
      {notice && (
        <div
          className={`mb-5 p-3 rounded-lg text-xs md:text-sm flex items-center justify-between border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. VIEW: MODULES OVERVIEW TABLE (Matching Agents page opening.png) */}
      {!selectedModule && activeTab === 'modules' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-6 w-[22%]">MODULE</th>
                <th className="py-3.5 px-6 w-[48%]">DESCRIPTION</th>
                <th className="py-3.5 px-6 w-[18%]">ACTIVE AGENTS</th>
                <th className="py-3.5 px-6 text-right w-[12%]">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULE_DEFINITIONS.filter(
                (m) =>
                  !search.trim() ||
                  m.name.toLowerCase().includes(search.toLowerCase()) ||
                  m.description.toLowerCase().includes(search.toLowerCase())
              ).map((mod) => {
                const count = countsByModule[mod.name]?.active || 0;
                return (
                  <tr
                    key={mod.name}
                    onClick={() => navigateToModule(mod.name)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            mod.name === 'Task'
                              ? 'bg-indigo-50 border border-indigo-100'
                              : mod.name === 'DSC'
                                ? 'bg-rose-50 border border-rose-100'
                                : 'bg-cyan-50 border border-cyan-100'
                          }`}
                        >
                          {mod.icon}
                        </div>
                        <p className="font-bold text-slate-900 group-hover:text-[#7C3AED] transition-colors">
                          {mod.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 align-middle max-w-md">
                      {mod.description}
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          count > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {count} Active Agents
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right align-middle">
                      <Link
                        href={`/agents/new?module=${mod.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] hover:underline transition-colors"
                      >
                        Add Agents +
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Table Footer matching Turia 1-3 of 3 */}
          <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
            <span>1-3 of 3</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Rows per page: 10</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. VIEW: MODULE SPECIFIC AGENTS LISTING (Task / DSC / License) */}
      {selectedModule && activeTab === 'modules' && (
        <div>
          {/* Header with Back Arrow */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={navigateBackToModules}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                title="Back to all modules"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 border border-purple-100">
                {MODULE_DEFINITIONS.find((m) => m.name === selectedModule)?.icon}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  {selectedModule} Agents
                </h1>
                <p className="text-xs md:text-sm text-slate-500">
                  Existing {selectedModule.toLowerCase()} agents.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56 md:w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs md:text-sm outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>

              <Link
                href={`/agents/new?module=${selectedModule}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs md:text-sm font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Agent
              </Link>
            </div>
          </div>

          {/* Table Container matching Turia Opening Pages */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-5">NAME</th>
                  <th className="py-3.5 px-5">TRIGGER</th>
                  <th className="py-3.5 px-5">CHANNEL</th>
                  <th className="py-3.5 px-5">RECIPIENTS</th>
                  <th className="py-3.5 px-5">LAST TRIGGERED</th>
                  <th className="py-3.5 px-5">STATUS</th>
                  <th className="py-3.5 px-5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moduleAgents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-6 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center py-4">
                        <Bot className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">
                          No {selectedModule.toLowerCase()} agents yet.
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "+ New Agent" above to create an automated notification workflow.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  moduleAgents.map((agent) => {
                    const cfg = agent.config || {};
                    const trigger = typeof cfg.trigger === 'string' ? cfg.trigger : '—';
                    const channel = typeof cfg.channel === 'string' ? cfg.channel : '—';
                    const recipients = Array.isArray(cfg.recipient) ? cfg.recipient : cfg.recipient ? [cfg.recipient] : [];
                    const isBusy = busyId === agent.id;
                    const isActive = agent.status === 'published';

                    return (
                      <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5">
                          <Link
                            href={`/agents/detail?id=${encodeURIComponent(agent.id)}`}
                            className="font-bold text-slate-900 hover:text-[#7C3AED] transition-colors"
                          >
                            {agent.name}
                          </Link>
                          {agent.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{agent.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-purple-50 text-[#7C3AED] border border-purple-100 text-xs font-semibold">
                            {trigger}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            {channel === 'Email' ? (
                              <Mail className="h-3.5 w-3.5 text-emerald-600" />
                            ) : channel === 'WhatsApp' ? (
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Bell className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            <span>{channel}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-1">
                            {recipients.length > 0 ? (
                              recipients.map((r) => (
                                <span
                                  key={String(r)}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                                >
                                  {String(r)}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-500">
                          {agent.publishedAt ? formatAgentDate(agent.publishedAt) : '—'}
                        </td>
                        <td className="py-4 px-5">
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(agent)}
                            disabled={isBusy}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActive ? 'bg-[#7C3AED]' : 'bg-slate-200'
                            }`}
                            title={isActive ? 'Click to disable' : 'Click to activate'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isActive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleTestRun(agent)}
                              disabled={isBusy}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Run simulated test"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              href={`/agents/edit?id=${encodeURIComponent(agent.id)}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Edit workflow"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {/* Table Footer with moduleAgents pagination */}
            <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>{moduleAgents.length > 0 ? `1-${moduleAgents.length} of ${moduleAgents.length}` : '0-0 of 0'}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Rows per page: 10</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW: AGENT HISTORY (Matching Agent History Page.png) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 5 Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Total Executions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{historyMetrics.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-700">Successful</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{historyMetrics.successful}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-700">Partial</p>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-700">{historyMetrics.partial}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-rose-700">Failed</p>
                <XCircle className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-rose-700">{historyMetrics.failed}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Skipped</p>
                <MinusCircle className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-600">{historyMetrics.skipped}</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter by module"
              value={historyModuleFilter}
              onChange={(e) => setHistoryModuleFilter(e.target.value as 'All' | AgentModule)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#7C3AED]"
            >
              <option value="All">All modules</option>
              <option value="Task">Task</option>
              <option value="DSC">DSC</option>
              <option value="License">License</option>
            </select>
            <select
              aria-label="Filter by status"
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#7C3AED]"
            >
              <option value="All">All statuses</option>
              <option value="success">Success</option>
              <option value="partial-failed">Partial</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          {/* History Execution Table */}
          {filteredHistory.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No executions recorded yet.</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Real background triggers and manual test-runs will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5">STATUS</th>
                    <th className="py-3 px-5">AGENT</th>
                    <th className="py-3 px-5">CLIENT</th>
                    <th className="py-3 px-5">MODULE</th>
                    <th className="py-3 px-5">TRIGGER EVENT</th>
                    <th className="py-3 px-5">CHANNEL</th>
                    <th className="py-3 px-5">RECIPIENTS</th>
                    <th className="py-3 px-5">DETAILS</th>
                    <th className="py-3 px-5 text-right">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => {
                    const client = String(item.triggerData?.clientName || '—');
                    const trigger = String(item.triggerData?.trigger || item.result?.trigger || 'Trigger event');
                    const channel = String(item.result?.channel || item.triggerData?.channel || 'Email');
                    const recipients = Array.isArray(item.result?.recipients)
                      ? item.result.recipients.join(', ')
                      : '—';
                    const details = item.errorMessage || item.result?.message || 'Execution completed';

                    const statusPill =
                      item.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </span>
                      ) : item.status === 'partial-failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="h-3 w-3" /> Partial
                        </span>
                      ) : item.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <MinusCircle className="h-3 w-3" /> Skipped
                        </span>
                      );

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                        <td className="py-3 px-5">{statusPill}</td>
                        <td className="py-3 px-5 font-semibold text-slate-800">
                          <Link
                            href={`/agents/detail?id=${encodeURIComponent(item.agentId)}`}
                            className="hover:text-[#7C3AED] hover:underline"
                          >
                            {item.agentName}
                          </Link>
                        </td>
                        <td className="py-3 px-5 text-slate-600">{client}</td>
                        <td className="py-3 px-5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                            {item.agentModule}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-700 font-medium">{trigger}</td>
                        <td className="py-3 px-5 text-slate-600">{channel}</td>
                        <td className="py-3 px-5 text-slate-600 max-w-xs truncate">{recipients}</td>
                        <td className="py-3 px-5 text-slate-500 max-w-xs truncate" title={details}>
                          {details}
                        </td>
                        <td className="py-3 px-5 text-right text-slate-400 whitespace-nowrap">
                          {formatAgentDate(item.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
            {/* Table Footer with filteredHistory pagination */}
            <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>{filteredHistory.length > 0 ? `1-${filteredHistory.length} of ${filteredHistory.length}` : '0-0 of 0'}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Rows per page: 10</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
}
