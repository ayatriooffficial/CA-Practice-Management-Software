'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';
import {
  Award,
  Bell,
  Bot,
  CheckSquare,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Search,
  Zap,
} from 'lucide-react';
import {
  useAgents,
  useDisableAgent,
  usePublishAgent,
  useTestRunAgent,
} from '@/hooks/useAgentCenterQuery';
import { Agent, AgentModule } from '@/types/agentCenter';
import { formatAgentDate } from './shared';

interface ModuleCardConfig {
  name: AgentModule;
  description: string;
  icon: React.ReactNode;
}

const CATEGORIES: AgentModule[] = ['Task', 'DSC', 'License'];

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
  const searchParams = useSearchParams();
  const queryModule = searchParams.get('module') as AgentModule | null;

  const initialModule: AgentModule =
    queryModule === 'DSC' || queryModule === 'License' || queryModule === 'Task'
      ? queryModule
      : 'Task';

  const [selectedModule, setSelectedModule] = useState<AgentModule>(initialModule);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (queryModule === 'Task' || queryModule === 'DSC' || queryModule === 'License') {
      setSelectedModule(queryModule);
    }
  }, [queryModule]);

  const { data: liveAgents = [], isLoading: agentsLoading, refetch: refetchAgents } = useAgents({}, true);

  const publish = usePublishAgent();
  const disable = useDisableAgent();
  const testRun = useTestRunAgent();

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

  const handleSelectCategory = (category: AgentModule) => {
    setSelectedModule(category);
    setSearch('');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/agents?module=${category}`);
    }
  };

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

  const currentModuleDef = MODULE_DEFINITIONS.find((m) => m.name === selectedModule) || MODULE_DEFINITIONS[0];

  return (
    <div className="w-full px-4 md:px-5 pt-4 pb-6 select-none bg-white min-h-[calc(100vh-56px)]">
      {/* 1. TOP HEADER ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 shrink-0">
            <Zap className="h-5 w-5 fill-purple-600 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Agent Center</h1>
            <p className="text-xs text-slate-500 mt-1">Set up automated notifications for your team</p>
          </div>
        </div>

        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${selectedModule} agents...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs md:text-sm outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>
      </div>

      {/* 2. CATEGORY TABS: Task, DSC, License */}
      <div className="flex border-b border-slate-200 mt-5 w-full">
        {CATEGORIES.map((cat) => {
          const isActive = selectedModule === cat;
          const count = countsByModule[cat]?.total || 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleSelectCategory(cat)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-[1px] flex items-center gap-2 cursor-pointer ${
                cat !== 'Task' ? 'ml-6' : ''
              } ${
                isActive
                  ? 'border-[#7C3AED] text-[#7C3AED]'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`mt-4 mb-2 p-3 rounded-lg text-xs md:text-sm flex items-center justify-between border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold underline ml-3 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. CATEGORY SECTION HEADING & ADD AGENT BUTTON */}
      <div className="flex items-center justify-between gap-3 mt-6 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              selectedModule === 'Task'
                ? 'bg-indigo-50 border border-indigo-100'
                : selectedModule === 'DSC'
                  ? 'bg-rose-50 border border-rose-100'
                  : 'bg-cyan-50 border border-cyan-100'
            }`}
          >
            {currentModuleDef.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
              {selectedModule} Agents
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {currentModuleDef.description}
            </p>
          </div>
        </div>

        <Link
          href={`/agents/new?module=${selectedModule}`}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs md:text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </Link>
      </div>

      {/* 4. AGENTS TABLE / CARDS CONTAINER */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Desktop Table (>= md) */}
        <table className="w-full text-left text-sm table-fixed hidden md:table">
          <thead className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
            <tr>
              <th className="py-3.5 px-5 w-[40%]">Name</th>
              <th className="py-3.5 px-5 w-[14%]">Trigger</th>
              <th className="py-3.5 px-5 w-[10%]">Channel</th>
              <th className="py-3.5 px-5 w-[12%]">Recipients</th>
              <th className="py-3.5 px-5 w-[10%]">Last Triggered</th>
              <th className="py-3.5 px-5 w-[6%]">Status</th>
              <th className="py-3.5 px-5 text-right w-[8%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agentsLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-xs text-slate-400">
                  Loading {selectedModule.toLowerCase()} agents...
                </td>
              </tr>
            ) : moduleAgents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Bot className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No {selectedModule} agents found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {search.trim() ? 'No agents match your search query.' : `Get started by creating your first automated ${selectedModule} agent.`}
                    </p>
                    {!search.trim() && (
                      <Link
                        href={`/agents/new?module=${selectedModule}`}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Agent
                      </Link>
                    )}
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
                        className="font-semibold text-slate-900 hover:text-[#7C3AED] transition-colors"
                      >
                        {agent.name}
                      </Link>
                      {agent.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{agent.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-purple-50 text-[#7C3AED] border border-purple-100 text-xs font-medium">
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
                          recipients.map((r: any) => (
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
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Run test simulation"
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

        {/* Mobile Cards View for Agents (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {agentsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading {selectedModule.toLowerCase()} agents...
            </div>
          ) : moduleAgents.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <Bot className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No {selectedModule} agents found</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {search.trim() ? 'No agents match your search query.' : `Get started by creating your first automated ${selectedModule} agent.`}
                </p>
                {!search.trim() && (
                  <Link
                    href={`/agents/new?module=${selectedModule}`}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Agent
                  </Link>
                )}
              </div>
            </div>
          ) : (
            moduleAgents.map((agent) => {
              const cfg = agent.config || {};
              const trigger = typeof cfg.trigger === 'string' ? cfg.trigger : '—';
              const channel = typeof cfg.channel === 'string' ? cfg.channel : '—';
              const recipients = Array.isArray(cfg.recipient) ? cfg.recipient : cfg.recipient ? [cfg.recipient] : [];
              const isBusy = busyId === agent.id;
              const isActive = agent.status === 'published';

              return (
                <div key={`mob_${agent.id}`} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/agents/detail?id=${encodeURIComponent(agent.id)}`}
                        className="font-semibold text-slate-900 hover:text-[#7C3AED] transition-colors text-sm break-words"
                      >
                        {agent.name}
                      </Link>
                      {agent.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{agent.description}</p>
                      )}
                    </div>

                    {/* Toggle status */}
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
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-purple-50 text-[#7C3AED] border border-purple-100 font-medium text-[11px]">
                      {trigger}
                    </span>
                    <div className="flex items-center gap-1 text-slate-700 text-xs">
                      {channel === 'Email' ? (
                        <Mail className="h-3.5 w-3.5 text-emerald-600" />
                      ) : channel === 'WhatsApp' ? (
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Bell className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      <span>{channel}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1 flex-wrap">
                      {recipients.length > 0 ? (
                        recipients.map((r: any) => (
                          <span
                            key={String(r)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                          >
                            {String(r)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleTestRun(agent)}
                        disabled={isBusy}
                        className="p-1 rounded text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Run test"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={`/agents/edit?id=${encodeURIComponent(agent.id)}`}
                        className="p-1 rounded text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Record count footer */}
      <div className="mt-2 text-right text-xs text-slate-400">
        {moduleAgents.length > 0 ? `1-${moduleAgents.length} of ${moduleAgents.length}` : '0-0 of 0'}
      </div>
    </div>
  );
}
