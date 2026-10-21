'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { useAgentGlobalHistory } from '@/hooks/useAgentCenterQuery';
import { AgentModule, AgentRun } from '@/types/agentCenter';
import { AgentPageTitle, NoticeBanner, Panel, RunDetails, StatusPill, formatAgentDate } from './shared';

export default function ExecutionHistory() {
  const { data: history = [], isLoading, isError, error, refetch, isFetching } = useAgentGlobalHistory(250);
  const [module, setModule] = useState<'All' | AgentModule>('All');
  const [kind, setKind] = useState<'All' | 'run' | 'activity'>('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => (module === 'All' || item.agentModule === module)
      && (kind === 'All' || (item.historyType || 'run') === kind)
      && (!q || item.agentName.toLowerCase().includes(q) || String(item.result?.message || item.errorMessage || item.action || '').toLowerCase().includes(q)));
  }, [history, module, kind, search]);

  return (
    <div className="mx-auto w-full max-w-[1300px] p-4 md:p-6 lg:p-8">
      <AgentPageTitle eyebrow="Automation" title="Agent execution history" description="Review recorded test simulations and agent creation activities." action={<button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</button>} />
      <div className="mb-5"><NoticeBanner type="info">This is not an audit log of every lifecycle change. The MVP records test runs and synthesizes creation activities; publish and disable changes are not separately recorded.</NoticeBanner></div>
      <Panel title="Activity" description={`${visible.length} records shown · newest first`}>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative"><span className="sr-only">Search history</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agent or activity" className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }} /></label>
          <select aria-label="Filter history by module" value={module} onChange={(event) => setModule(event.target.value as 'All' | AgentModule)} className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }}><option value="All">All modules</option><option value="Task">Task</option><option value="DSC">DSC</option><option value="License">License</option></select>
          <select aria-label="Filter history by type" value={kind} onChange={(event) => setKind(event.target.value as 'All' | 'run' | 'activity')} className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }}><option value="All">All activity types</option><option value="run">Test runs</option><option value="activity">Creation activities</option></select>
        </div>
        {isLoading ? <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading history…</div> : isError ? <NoticeBanner type="error">History could not be loaded. {error instanceof Error ? error.message : ''} <button type="button" onClick={() => void refetch()} className="font-bold underline">Retry</button></NoticeBanner> : visible.length === 0 ? <div className="py-10 text-center"><Activity className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} /><p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No history records match these filters.</p></div> : <div className="space-y-3">{visible.map((item) => <HistoryItem key={`${item.historyType || 'run'}-${item.id}`} item={item} open={expanded === item.id} onToggle={() => setExpanded(expanded === item.id ? null : item.id)} />)}</div>}
      </Panel>
    </div>
  );
}

function HistoryItem({ item, open, onToggle }: { item: AgentRun; open: boolean; onToggle: () => void }) {
  const isActivity = item.historyType === 'activity' || item.action === 'created';
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)' }}><Activity className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/agents/detail?id=${encodeURIComponent(item.agentId)}`} className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>{item.agentName}</Link><span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{item.agentModule}</span></div><p className="mt-1 text-sm" style={{ color: 'var(--text-main)' }}>{isActivity ? 'Agent created as draft' : item.result?.message || item.errorMessage || 'Simulated test run recorded'}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatAgentDate(item.createdAt)} · {isActivity ? 'Activity' : 'Test run'}{!isActivity && item.executionMode ? ` · ${item.executionMode} mode` : ''}</p></div></div>
        <div className="flex items-center gap-2"><StatusPill status={item.status} />{!isActivity && <button type="button" onClick={onToggle} className="text-xs font-semibold underline" style={{ color: 'var(--primary)' }}>{open ? 'Hide details' : 'Details'}</button>}</div>
      </div>
      {open && !isActivity && <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-main)' }}><RunDetails run={item} /></div>}
    </div>
  );
}
