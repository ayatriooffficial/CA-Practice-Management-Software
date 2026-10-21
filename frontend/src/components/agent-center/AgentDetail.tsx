'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Clock3, ExternalLink, Pencil, Play, Power, RefreshCw } from 'lucide-react';
import { useAgent, useAgentHistory, useDisableAgent, usePublishAgent, useTestRunAgent } from '@/hooks/useAgentCenterQuery';
import { AgentConfigDraft } from '@/types/agentCenter';
import { AgentPageTitle, NoticeBanner, Panel, RunDetails, StatusPill, formatAgentDate } from './shared';

export default function AgentDetail({ id }: { id: string }) {
  const agentQuery = useAgent(id);
  const historyQuery = useAgentHistory(id);
  const publish = usePublishAgent();
  const disable = useDisableAgent();
  const testRun = useTestRunAgent();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [openedRun, setOpenedRun] = useState<string | null>(null);

  async function act(action: 'publish' | 'disable' | 'test-run') {
    if (!agentQuery.data) return;
    setBusy(true);
    setNotice(null);
    try {
      if (action === 'publish') {
        await publish.mutateAsync(id);
        setNotice({ type: 'success', text: 'Agent published successfully.' });
      } else if (action === 'disable') {
        await disable.mutateAsync(id);
        setNotice({ type: 'success', text: 'Agent disabled successfully. This MVP does not support re-enabling it.' });
      } else {
        const run = await testRun.mutateAsync(id);
        setOpenedRun(run.id);
        setNotice(run.status === 'failed'
          ? { type: 'error', text: `Simulation failed: ${run.errorMessage || 'one or more mock provider operations failed'}` }
          : { type: 'info', text: 'Simulation completed. No real notification was sent.' });
      }
      await agentQuery.refetch();
      await historyQuery.refetch();
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError instanceof Error ? actionError.message : 'The action failed.' });
    } finally {
      setBusy(false);
    }
  }

  if (agentQuery.isLoading) return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading agent details…</div>;
  if (agentQuery.isError || !agentQuery.data) return <div className="mx-auto max-w-3xl p-6"><NoticeBanner type="error">Agent details could not be loaded. {agentQuery.error instanceof Error ? agentQuery.error.message : ''}</NoticeBanner><button type="button" onClick={() => void agentQuery.refetch()} className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Try again</button><Link href="/agents" className="ml-3 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Back to Agent Center</Link></div>;

  const agent = agentQuery.data;
  const config = (agent.config || {}) as AgentConfigDraft;
  const recipients = Array.isArray(config.recipient) ? config.recipient.join(', ') : typeof config.recipient === 'string' ? config.recipient : '—';
  const details: Array<[string, string]> = [
    ['Trigger', typeof config.trigger === 'string' ? config.trigger : '—'],
    ['Conditions', config.conditions && typeof config.conditions === 'object' ? Object.entries(config.conditions).map(([key, value]) => `${key}: ${String(value)}`).join(', ') || 'None' : 'None'],
    ['Recipients', recipients],
    ['Channel', typeof config.channel === 'string' ? config.channel : '—'],
    ['Action', typeof config.action === 'string' ? config.action : '—'],
    ['Message template', typeof config.message === 'string' ? config.message : '—'],
  ];
  const isDraft = agent.status === 'draft';
  const isPublished = agent.status === 'published';

  const action = <div className="flex flex-wrap gap-2">{isDraft && <><Link href={`/agents/edit?id=${encodeURIComponent(agent.id)}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><Pencil className="h-4 w-4" /> Edit draft</Link><button type="button" disabled={busy} onClick={() => void act('publish')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}><Power className="h-4 w-4" /> Publish</button></>}{isPublished && <><button type="button" disabled={busy} onClick={() => void act('test-run')} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}><Play className="h-4 w-4" /> Run simulated test</button><button type="button" disabled={busy} onClick={() => void act('disable')} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><Power className="h-4 w-4" /> Disable</button></>}</div>;

  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 md:p-6 lg:p-8">
      <Link href="/agents" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}><ArrowLeft className="h-4 w-4" /> Back to Agent Center</Link>
      <AgentPageTitle eyebrow={`${agent.module} agent`} title={agent.name} description={agent.description || 'No description provided.'} action={action} />
      <div className="mb-5 flex flex-wrap items-center gap-3"><StatusPill status={agent.status} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {formatAgentDate(agent.updatedAt)}</span></div>
      {notice && <div className="mb-5"><NoticeBanner type={notice.type}>{notice.text}</NoticeBanner></div>}
      {isPublished && <div className="mb-5"><NoticeBanner type="info">Published agents are read-only. Test runs use fixed sample data and mock providers. No real notification is sent.</NoticeBanner></div>}
      {agent.status === 'disabled' && <div className="mb-5"><NoticeBanner type="info">This agent is disabled and cannot be edited, published, or test-run. Re-enabling is not implemented in this MVP.</NoticeBanner></div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel title="Configuration" description="One event, one channel, and one configured action.">
          <dl className="grid gap-3 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}><dt className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--text-main)' }}>{value}</dd></div>)}</dl>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}><span>Created {formatAgentDate(agent.createdAt)}</span>{agent.publishedAt && <span>Published {formatAgentDate(agent.publishedAt)}</span>}</div>
        </Panel>

        <Panel title="Execution history" description="Most recent simulation attempts for this agent." action={<Link href="/agents/history" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>All history <ExternalLink className="h-3.5 w-3.5" /></Link>}>
          {historyQuery.isLoading ? <p className="py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading history…</p> : historyQuery.isError ? <NoticeBanner type="error">Could not load this agent’s history. <button type="button" onClick={() => void historyQuery.refetch()} className="font-bold underline">Retry</button></NoticeBanner> : !historyQuery.data?.length ? <div className="py-8 text-center"><Clock3 className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} /><p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>No test runs yet</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{isPublished ? 'Run a simulated test to create the first execution record.' : 'Publish the agent before attempting a test run.'}</p></div> : <div className="space-y-3">{historyQuery.data.slice(0, 8).map((run) => <div key={run.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-main)' }}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Test run · {run.status}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatAgentDate(run.createdAt)}</p><p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{run.result?.message || run.errorMessage || 'Simulation record'}</p></div><div className="flex items-center gap-2"><StatusPill status={run.status} /><button type="button" onClick={() => setOpenedRun(openedRun === run.id ? null : run.id)} className="text-xs font-semibold underline" style={{ color: 'var(--primary)' }}>{openedRun === run.id ? 'Hide' : 'Details'}</button></div></div>{openedRun === run.id && <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-main)' }}><RunDetails run={run} /></div>}</div>)}</div>}
        </Panel>
      </div>
      <div className="mt-5 flex justify-end"><button type="button" onClick={() => { void agentQuery.refetch(); void historyQuery.refetch(); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><RefreshCw className="h-4 w-4" /> Refresh</button></div>
    </div>
  );
}
