'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Clock3, ExternalLink, Mail, Pencil, Play, Power, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useAgent, useAgentHistory, useDeleteAgent, useDisableAgent, useIntegrationsStatus, usePublishAgent, useTestRunAgent } from '@/hooks/useAgentCenterQuery';
import { AgentConfigDraft, WorkflowGraph } from '@/types/agentCenter';
import * as gmail from '@/lib/integrations/gmail';
import { AgentPageTitle, NoticeBanner, Panel, RunDetails, StatusPill, formatAgentDate, renderTemplateString, buildAgentSampleVariables } from './shared';

export default function AgentDetail({ id }: { id: string }) {
  const agentQuery = useAgent(id);
  const router = useRouter();
  const historyQuery = useAgentHistory(id);
  const publish = usePublishAgent();
  const disable = useDisableAgent();
  const testRun = useTestRunAgent();
  const deleteAgent = useDeleteAgent();
  const integrations = useIntegrationsStatus();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [openedRun, setOpenedRun] = useState<string | null>(null);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  async function handleSendTestEmail() {
    const cleanEmail = testEmailAddress.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNotice({ type: 'error', text: 'Please enter a valid recipient email address for testing.' });
      return;
    }
    if (!agentQuery.data) return;

    setBusy(true);
    setNotice(null);
    try {
      const agent = agentQuery.data;
      const sampleVars = buildAgentSampleVariables(agent.module, agent.name, 'Client');
      const renderedSubject = renderTemplateString(
        agent.config.subject || agent.config.action || `Notification from ${agent.name}`,
        sampleVars
      );
      const renderedBody = renderTemplateString(
        agent.config.message || `Hello,\nThis is a notification for ${agent.name}.`,
        sampleVars
      );

      // Priority 1: Dispatch using the exact Gmail sending function from the Email module
      let externalMessageId: string | undefined;
      try {
        const sendRes = await gmail.send({
          to: cleanEmail,
          subject: renderedSubject,
          body: renderedBody,
        });
        if (sendRes?.id) {
          externalMessageId = sendRes.id;
        }
      } catch (gmailErr: unknown) {
        console.warn('Direct frontend /api/gmail/send failed, deferring to backend delivery service:', gmailErr);
      }

      // Priority 2: Record execution (or deliver via backend MailService if frontend send did not execute)
      const run = await testRun.mutateAsync({
        id,
        testEmail: cleanEmail,
        mode: 'live',
        messageId: externalMessageId,
      });

      setShowTestEmailModal(false);
      setOpenedRun(run.id);

      const runResult = run.result as { results?: Array<{ executionId?: string; error?: string; status?: string }> } | null;
      const firstResult = runResult?.results?.[0];

      if (run.status === 'success' || (run.status as string) === 'delivered' || firstResult?.status === 'delivered') {
        const msgId = externalMessageId || firstResult?.executionId || 'Delivered';
        setNotice({
          type: 'success',
          text: `Real test email successfully sent to ${cleanEmail}! Message ID: ${msgId}`,
        });
      } else {
        const errText = run.errorMessage || firstResult?.error || 'Email delivery failed. Please check Gmail connection status.';
        setNotice({
          type: 'error',
          text: `Real test delivery failed: ${errText}`,
        });
      }
      await agentQuery.refetch();
      await historyQuery.refetch();
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'The test delivery request failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function act(action: 'publish' | 'disable' | 'test-run' | 'delete') {
    if (!agentQuery.data) return;
    setBusy(true);
    setNotice(null);
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this draft workflow? This removes its configuration. Recorded runs remain in history.')) return;
        await deleteAgent.mutateAsync(id);
        router.push('/agents');
        return;
      } else if (action === 'publish') {
        await publish.mutateAsync(id);
        setNotice({ type: 'success', text: 'Agent published successfully.' });
      } else if (action === 'disable') {
        await disable.mutateAsync(id);
        setNotice({ type: 'success', text: 'Agent disabled successfully. This MVP does not support re-enabling it.' });
      } else {
        const run = await testRun.mutateAsync({ id, mode: 'test' });
        setOpenedRun(run.id);
        setNotice(run.status === 'failed' || run.status === 'partial-failed'
          ? { type: 'error', text: `Simulation ${run.status}: ${run.errorMessage || 'one or more mock provider operations failed'}` }
          : { type: 'info', text: run.status === 'skipped' ? 'Simulation ended without reaching an action. No message was sent.' : 'Simulation completed. No real notification was sent.' });
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
  if (agentQuery.isError || !agentQuery.data) return <div className="w-full px-6 py-6 md:px-8"><NoticeBanner type="error">Agent details could not be loaded. {agentQuery.error instanceof Error ? agentQuery.error.message : ''}</NoticeBanner><button type="button" onClick={() => void agentQuery.refetch()} className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Try again</button><Link href="/agents" className="ml-3 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Back to Agent Center</Link></div>;

  const agent = agentQuery.data;
  const config = (agent.config || {}) as AgentConfigDraft;
  const recipients = Array.isArray(config.recipient) ? config.recipient.join(', ') : typeof config.recipient === 'string' ? config.recipient : '—';
  const graph = config.workflowGraph as WorkflowGraph | undefined;
  const details: Array<[string, string]> = [
    ['Trigger', typeof config.trigger === 'string' ? config.trigger : '—'],
    ['Conditions', config.conditions && typeof config.conditions === 'object' ? Object.entries(config.conditions).map(([key, value]) => `${key}: ${String(value)}`).join(', ') || 'None' : 'None'],
    ['Recipients', recipients],
    ...(recipients.includes('Client') ? [['Client selection rule', 'Use the client linked to the triggering Task, scoped to this organization.'] as [string, string]] : []),
    ['Channel', typeof config.channel === 'string' ? config.channel : '—'],
    ['Action', typeof config.action === 'string' ? config.action : '—'],
    ['Email template', typeof config.templateId === 'string' && config.templateId !== 'custom' ? config.templateId : 'Custom message'],
    ['Email subject', typeof config.subject === 'string' ? config.subject : '—'],
    ['Message template', typeof config.message === 'string' ? config.message : '—'],
    ['Connected steps', graph?.nodes?.length ? graph.nodes.map((node) => `${node.name} (${node.type})`).join(' → ') : 'Legacy notification action'],
    ['Saved connections', graph?.edges?.length ? graph.edges.map((edge) => `${graph.nodes.find((node) => node.id === edge.source)?.name || edge.source} —${edge.sourceHandle || 'next'}→ ${edge.target === '__end__' ? 'End' : graph.nodes.find((node) => node.id === edge.target)?.name || edge.target}`).join(' · ') : 'None'],
  ];
  const isDraft = agent.status === 'draft';
  const isPublished = agent.status === 'published';

  const action = (
    <div className="flex flex-wrap gap-2">
      {isDraft && (
        <>
          <Link
            href={`/agents/edit?id=${encodeURIComponent(agent.id)}`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
          >
            <Pencil className="h-4 w-4" /> Edit draft
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('publish')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Power className="h-4 w-4" /> Publish
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('delete')}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
            style={{ borderColor: 'var(--border-main)' }}
          >
            <Trash2 className="h-4 w-4" /> Delete draft
          </button>
        </>
      )}
      {isPublished && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('test-run')}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', backgroundColor: 'var(--bg-surface)' }}
          >
            <Play className="h-4 w-4" /> Run simulated test
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setTestEmailAddress(integrations.data?.email?.email || 'searchaicloud@gmail.com');
              setShowTestEmailModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Send className="h-4 w-4" /> Send Test Email
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('disable')}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
          >
            <Power className="h-4 w-4" /> Disable
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full px-6 py-6 md:px-8">
      <Link href="/agents" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}><ArrowLeft className="h-4 w-4" /> Back to Agent Center</Link>
      <AgentPageTitle eyebrow={`${agent.module} agent`} title={agent.name} description={agent.description || 'No description provided.'} action={action} />
      <div className="mb-5 flex flex-wrap items-center gap-3"><StatusPill status={agent.status} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {formatAgentDate(agent.updatedAt)}</span></div>
      {notice && <div className="mb-5"><NoticeBanner type={notice.type}>{notice.text}</NoticeBanner></div>}
      {integrations.data?.email && !integrations.data.email.configured && (
        <div className="mb-5">
          <NoticeBanner type="warning">
            ⚠️ <strong>Gmail authorization required for real email delivery:</strong> The practice Gmail connection is disconnected or expired ({integrations.data.email.statusText}). To enable live sending, please{' '}
            <Link href="/email" className="font-bold underline" style={{ color: 'var(--primary)' }}>
              authorize Gmail at /email
            </Link>.
          </NoticeBanner>
        </div>
      )}
      {isPublished && (
        <div className="mb-5">
          <NoticeBanner type="info">
            Published agents trigger automatically on real events. Use <strong>Run simulated test</strong> for safe offline preview, or <strong>Send Test Email</strong> to dispatch a single real test notification directly to your verified test inbox without messaging clients.
          </NoticeBanner>
        </div>
      )}
      {agent.status === 'disabled' && <div className="mb-5"><NoticeBanner type="info">This agent is disabled and cannot be edited, published, or test-run. Re-enabling is not implemented in this MVP.</NoticeBanner></div>}

      {showTestEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-main)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Send Controlled Test Email</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Safe single-recipient live delivery test</p>
              </div>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              This dispatches a real email using this agent&apos;s rendered template through the practice Gmail integration (<strong>{integrations.data?.email?.email || 'searchaicloud@gmail.com'}</strong>). The message will be delivered <strong>ONLY</strong> to the verified test inbox entered below.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Destination Test Inbox
              </label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="e.g. your-inbox@example.com"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowTestEmailModal(false)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold"
                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSendTestEmail()}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Test Email Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel title="Configuration" description="Saved Event → Recipient → Channel → Action settings and persisted condition/action graph.">
          <dl className="grid gap-3 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}><dt className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--text-main)' }}>{value}</dd></div>)}</dl>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}><span>Created {formatAgentDate(agent.createdAt)}</span>{agent.publishedAt && <span>Published {formatAgentDate(agent.publishedAt)}</span>}</div>
        </Panel>

        <Panel title="Execution history" description="Most recent simulation attempts for this agent." action={<Link href="/agents/history" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>All history <ExternalLink className="h-3.5 w-3.5" /></Link>}>
          {historyQuery.isLoading ? <p className="py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading history…</p> : historyQuery.isError ? <NoticeBanner type="error">Could not load this agent’s history. <button type="button" onClick={() => void historyQuery.refetch()} className="font-bold underline">Retry</button></NoticeBanner> : !historyQuery.data?.length ? <div className="py-8 text-center"><Clock3 className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} /><p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>No runs yet</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{isPublished ? 'Run a simulated test or wait for a supported Task event.' : 'Publish the agent before attempting a run.'}</p></div> : <div className="space-y-3">{historyQuery.data.slice(0, 8).map((run) => <div key={run.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-main)' }}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{run.runType === 'actual' ? 'Task event · actions simulated' : 'Test run'} · {run.status}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatAgentDate(run.createdAt)}</p><p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{run.result?.message || run.errorMessage || 'Simulation record'}</p></div><div className="flex items-center gap-2"><StatusPill status={run.status} /><button type="button" onClick={() => setOpenedRun(openedRun === run.id ? null : run.id)} className="text-xs font-semibold underline" style={{ color: 'var(--primary)' }}>{openedRun === run.id ? 'Hide' : 'Details'}</button></div></div>{openedRun === run.id && <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-main)' }}><RunDetails run={run} /></div>}</div>)}</div>}
        </Panel>
      </div>
      <div className="mt-5 flex justify-end"><button type="button" onClick={() => { void agentQuery.refetch(); void historyQuery.refetch(); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><RefreshCw className="h-4 w-4" /> Refresh</button></div>
    </div>
  );
}
