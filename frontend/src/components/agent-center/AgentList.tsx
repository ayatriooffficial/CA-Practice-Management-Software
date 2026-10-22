'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Activity, ArrowRight, Bot, Plus, RefreshCw, Search, ShieldCheck, Workflow } from 'lucide-react';
import { useAgents, useDisableAgent, usePublishAgent, useTestRunAgent } from '@/hooks/useAgentCenterQuery';
import { PUBLIC_AGENT_DEFINITIONS } from '../../../../backend/src/modules/agentCenter/catalog';
import { AgentModule, AgentStatus } from '@/types/agentCenter';
import { AgentPageTitle, NoticeBanner, StatusPill } from './shared';

const MODULES = Object.entries(PUBLIC_AGENT_DEFINITIONS.modules).map(([name, definition]) => ({
  name: name as AgentModule,
  description: definition.cardDescription,
  symbol: definition.symbol,
}));

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export default function AgentList() {
  const [liveDataRequested, setLiveDataRequested] = useState(false);
  const { data: liveAgents, isLoading, isError, refetch, isFetching } = useAgents({}, liveDataRequested);
  const agents = liveAgents || [];
  const publish = usePublishAgent();
  const disable = useDisableAgent();
  const testRun = useTestRunAgent();
  const [moduleFilter, setModuleFilter] = useState<'All' | AgentModule>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | AgentStatus>('All');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const counts = useMemo(() => MODULES.map((module) => {
    const matching = agents.filter((agent) => agent.module === module.name);
    return { ...module, total: matching.length, published: matching.filter((agent) => agent.status === 'published').length };
  }), [agents]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return agents.filter((agent) =>
      (moduleFilter === 'All' || agent.module === moduleFilter)
      && (statusFilter === 'All' || agent.status === statusFilter)
      && (!query || agent.name.toLowerCase().includes(query) || agent.description.toLowerCase().includes(query))
    );
  }, [agents, moduleFilter, statusFilter, search]);

  async function doAction(id: string, verb: 'publish' | 'disable' | 'test-run', name: string) {
    setBusyId(id);
    setNotice(null);
    try {
      if (verb === 'publish') {
        await publish.mutateAsync(id);
        setNotice({ type: 'success', text: `“${name}” has been published.` });
      } else if (verb === 'disable') {
        await disable.mutateAsync(id);
        setNotice({ type: 'success', text: `“${name}” has been disabled.` });
      } else {
        const run = await testRun.mutateAsync(id);
        setNotice(run.status === 'failed'
          ? { type: 'error', text: `The simulated test run failed for “${name}”: ${run.errorMessage || 'provider operation failed'}` }
          : { type: 'info', text: `Simulation completed for “${name}”. No real notification was sent.` });
      }
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError instanceof Error ? actionError.message : 'The requested action failed.' });
    } finally {
      setBusyId(null);
    }
  }

  const titleAction = <Link href="/agents/new" className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: 'var(--primary)' }}><Plus className="h-4 w-4" /> Create agent</Link>;

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">
      <AgentPageTitle eyebrow="Automation" title="Agent Center" description="Configure event-based workflow notifications for Task, DSC and License modules." action={titleAction} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-xs" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
        <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: 'var(--primary)' }} />
        <span><strong style={{ color: 'var(--text-main)' }}>Simulation mode:</strong> test runs use fixed sample records and mock providers. They never send real notifications.</span>
      </div>

      {notice && <div className="mb-5"><NoticeBanner type={notice.type}>{notice.text}</NoticeBanner></div>}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {counts.map((module) => (
          <div key={module.name} className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-main)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg text-sm font-bold" style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)' }}>{module.symbol}</span>
                <div><h2 className="font-bold" style={{ color: 'var(--text-main)' }}>{module.name}</h2><p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{module.description}</p></div>
              </div>
              <button type="button" onClick={() => setModuleFilter(module.name)} className="text-xs font-semibold underline" style={{ color: 'var(--primary)' }}>View</button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: 'var(--border-main)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{liveAgents ? `${module.total} configured` : '— configured'}</span>
              <span className="rounded-full px-2 py-1 font-semibold" style={{ color: liveAgents ? '#047857' : 'var(--text-muted)', backgroundColor: liveAgents ? '#d1fae5' : 'var(--bg-muted)' }}>{liveAgents ? `${module.published} published` : '—'}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--border-main)' }}>
          <div><h2 className="font-bold" style={{ color: 'var(--text-main)' }}>Configured agents</h2><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Draft, publish, disable, and run a safe simulation.</p></div>
          <button type="button" onClick={() => { setLiveDataRequested(true); void refetch(); }} disabled={isFetching} className={`${buttonClass} hover:bg-slate-50`} style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>

        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row" style={{ borderColor: 'var(--border-main)' }}>
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search agents</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or description" className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }} /></label>
          <select aria-label="Filter by module" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as 'All' | AgentModule)} className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }}><option value="All">All modules</option>{MODULES.map((module) => <option key={module.name} value={module.name}>{module.name}</option>)}</select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | AgentStatus)} className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }}><option value="All">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="disabled">Disabled</option></select>
        </div>

        {isError && liveAgents && <div className="border-b p-4" style={{ borderColor: 'var(--border-main)' }}><NoticeBanner type="error">Could not refresh live agent records. Showing the last data received. <button type="button" onClick={() => void refetch()} className="font-bold underline">Try again</button></NoticeBanner></div>}

        {isError && !liveAgents ? (
          <div className="border-b p-6" style={{ borderColor: 'var(--border-main)' }}><NoticeBanner type="error">Could not load live agent records. Check that the backend is running and connected to MongoDB.<button type="button" onClick={() => void refetch()} className="ml-2 font-bold underline">Try again</button></NoticeBanner></div>
        ) : isLoading && !liveAgents ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading live agents…</div>
        ) : !liveAgents ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Live agent records have not been loaded.</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-xl" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}><Bot className="h-6 w-6" /></span><h3 className="font-bold" style={{ color: 'var(--text-main)' }}>{agents.length === 0 ? 'No agents configured yet' : 'No matching agents'}</h3><p className="mt-1 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>{agents.length === 0 ? 'Create your first agent to define an event, recipients, channel and action.' : 'Try changing your search or filters.'}</p>{agents.length === 0 && <Link href="/agents/new" className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--primary)' }}><Plus className="h-4 w-4" /> Create first agent</Link>}</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}><tr>{['Agent', 'Module', 'Trigger / channel', 'Status', 'Updated', 'Actions'].map((item) => <th key={item} className="px-4 py-3 text-xs font-bold uppercase tracking-wide">{item}</th>)}</tr></thead><tbody>{visible.map((agent) => {
            const config = agent.config || {};
            const busy = busyId === agent.id;
            return <tr key={agent.id} className="border-t align-top" style={{ borderColor: 'var(--border-main)' }}><td className="px-4 py-4"><Link href={`/agents/detail?id=${encodeURIComponent(agent.id)}`} className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>{agent.name}</Link><p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>{agent.description || 'No description provided.'}</p></td><td className="px-4 py-4"><span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)' }}>{agent.module}</span></td><td className="px-4 py-4"><p className="font-medium" style={{ color: 'var(--text-main)' }}>{typeof config.trigger === 'string' ? config.trigger : 'Not configured'}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{typeof config.channel === 'string' ? config.channel : 'Channel not set'}</p></td><td className="px-4 py-4"><StatusPill status={agent.status} /></td><td className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(agent.updatedAt).toLocaleDateString('en-IN')}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{agent.status === 'draft' && <><Link href={`/agents/edit?id=${encodeURIComponent(agent.id)}`} className={`${buttonClass} hover:bg-slate-50`} style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Edit</Link><button type="button" disabled={busy} onClick={() => void doAction(agent.id, 'publish', agent.name)} className={`${buttonClass} border-transparent text-white`} style={{ backgroundColor: 'var(--primary)' }}>Publish</button></>}{agent.status === 'published' && <><button type="button" disabled={busy} onClick={() => void doAction(agent.id, 'test-run', agent.name)} className={`${buttonClass} border-transparent text-white`} style={{ backgroundColor: 'var(--primary)' }}><Activity className="h-3.5 w-3.5" /> Test run</button><button type="button" disabled={busy} onClick={() => void doAction(agent.id, 'disable', agent.name)} className={`${buttonClass} hover:bg-slate-50`} style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Disable</button></>}{agent.status === 'disabled' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Terminal state</span>}<Link href={`/agents/detail?id=${encodeURIComponent(agent.id)}`} aria-label={`View ${agent.name}`} className={`${buttonClass} hover:bg-slate-50`} style={{ borderColor: 'var(--border-main)', color: 'var(--primary)' }}><ArrowRight className="h-3.5 w-3.5" /> View</Link></div>{busy && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Working…</p>}</td></tr>;
          })}</tbody></table><div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}><span>Showing {visible.length} of {agents.length} agents</span><Link href="/agents/history" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--primary)' }}>View execution history <Workflow className="h-3.5 w-3.5" /></Link></div></div>
        )}
      </section>
    </div>
  );
}
