import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, PauseCircle, PlayCircle } from 'lucide-react';
import { AgentStatus, AgentRun } from '@/types/agentCenter';

export function formatAgentDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

const statusStyles: Record<string, string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  disabled: 'border-amber-200 bg-amber-50 text-amber-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  failed: 'border-rose-200 bg-rose-50 text-rose-800',
  'partial-failed': 'border-amber-200 bg-amber-50 text-amber-800',
  skipped: 'border-slate-200 bg-slate-100 text-slate-700',
  simulated: 'border-sky-200 bg-sky-50 text-sky-800',
  activity: 'border-sky-200 bg-sky-50 text-sky-800',
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status] || statusStyles.draft}`}>{status}</span>;
}

export function NoticeBanner({ type, children }: { type: 'success' | 'error' | 'info' | 'warning'; children: React.ReactNode }) {
  const style = type === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : type === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-sky-200 bg-sky-50 text-sky-800';
  const Icon = type === 'error' || type === 'warning' ? AlertCircle : type === 'success' ? CheckCircle2 : Clock3;
  return <div role={type === 'error' || type === 'warning' ? 'alert' : 'status'} className={`flex gap-2 rounded-lg border px-4 py-3 text-sm ${style}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>;
}

export function AgentPageTitle({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--primary)' }}>{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{title}</h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, description, children, action }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-5 shadow-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{title}</h2>
          {description && <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RunDetails({ run }: { run: AgentRun }) {
  const result = run.result;
  const isSimulated = run.executionMode === 'mock' || result?.simulated === true;
  return (
    <div className="space-y-4 text-sm">
      {isSimulated ? (
        <NoticeBanner type="info">SIMULATED ONLY — no email, WhatsApp message, or in-app notification was sent.</NoticeBanner>
      ) : run.status === 'success' || (run.status as string) === 'delivered' ? (
        <NoticeBanner type="success">REAL DELIVERY: Sent via {result?.channel || 'Email'} · Message ID: {result?.results?.[0]?.executionId || 'Delivered'}</NoticeBanner>
      ) : run.status === 'partial-failed' ? (
        <NoticeBanner type="warning">PARTIAL DELIVERY: Some message dispatches succeeded while others failed.</NoticeBanner>
      ) : (
        <NoticeBanner type="error">DELIVERY ATTEMPT FAILED: {run.errorMessage || result?.results?.[0]?.error || 'Provider delivery failure'}</NoticeBanner>
      )}

      {run.runType === 'actual' && isSimulated && (
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          A real Task lifecycle event started this run. Actions were previewed in simulation mode.
        </p>
      )}
      {run.runType === 'actual' && !isSimulated && (
        <p className="text-xs font-semibold text-emerald-700">
          A real lifecycle event started this run and dispatched real live notifications.
        </p>
      )}

      {result?.message && <p style={{ color: 'var(--text-main)' }}>{result.message}</p>}
      {result?.renderedMessage && (
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Rendered message content</p>
          <p className="whitespace-pre-wrap break-words" style={{ color: 'var(--text-main)' }}>{result.renderedMessage}</p>
        </div>
      )}
      {result?.steps?.length ? (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {isSimulated ? 'Simulation steps' : 'Execution steps'}
          </h3>
          <ol className="space-y-2">
            {result.steps.map((step, index) => (
              <li key={`${index}-${step}`} className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {index + 1}
                </span>
                <span style={{ color: 'var(--text-main)' }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {result?.results?.length ? (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Recipient outcomes</h3>
          <div className="space-y-2">
            {result.results.map((item, index) => (
              <div key={`${item.recipient || 'recipient'}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{item.recipient || item.recipientData?.name || 'Recipient'}</p>
                  <p className="mt-0.5 text-xs font-mono" style={{ color: item.status === 'delivered' ? 'var(--status-online)' : 'var(--text-muted)' }}>
                    {item.provider ? item.provider.toUpperCase() : (result.channel || 'EMAIL')} · {item.executionId || (item.simulated ? 'Simulated' : 'Dispatched')}
                  </p>
                  {item.error && <p className="mt-1 text-xs text-rose-700 font-sans">{item.error}</p>}
                </div>
                <StatusPill status={item.status} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {run.errorMessage && <p className="text-sm text-rose-700">{run.errorMessage}</p>}
    </div>
  );
}

export function statusActionLabel(status: AgentStatus) {
  if (status === 'published') return 'Published';
  if (status === 'disabled') return 'Disabled';
  return 'Draft';
}

export function renderTemplateString(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, path: string) => {
    const value = path.split('.').reduce<unknown>(
      (source, key) => (source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined),
      variables
    );
    return value === undefined || value === null ? match : String(value);
  });
}

export function buildAgentSampleVariables(
  module: 'Task' | 'DSC' | 'License',
  agentName: string,
  recipientRole = 'Client'
): Record<string, unknown> {
  const client = {
    name: 'Sample Client',
    email: 'client@example.test',
    mobile: '+91 98765 43210',
  };

  const taskObj = {
    id: 'TASK-1001',
    taskId: 'TASK-1001',
    taskName: 'Prepare monthly compliance report',
    clientName: client.name,
    priority: 'High',
    status: 'In Progress',
    targetDueDate: '2026-02-15',
    dueDate: '2026-02-15',
    assignee: 'Sample User',
    assigneeName: 'Sample User',
    reviewer_name: 'Sample Reviewer',
    reviewerName: 'Sample Reviewer',
    creatorName: 'Sample Manager',
  };

  const dscObj = {
    id: 'DSC-2001',
    dscId: '#S00184',
    holder: 'Sample Director',
    name: 'Sample Director DSC',
    vendor: 'eMudhra',
    certificateClass: 'Class 3',
    expiryDate: '2026-02-01',
    clientName: client.name,
  };

  const licenseObj = {
    id: 'LIC-3001',
    licenseNo: 'LIC-78902',
    name: 'Sample Trade License',
    owner: client.name,
    expiryDate: '2026-02-01',
    clientName: client.name,
  };

  const recipientData: Record<string, { name: string; email: string; mobile: string }> = {
    Client: { name: client.name, email: client.email, mobile: client.mobile },
    'Assigned user': { name: 'Sample User', email: 'user@example.test', mobile: '+91 98765 43211' },
    'Task owner': { name: 'Sample Manager', email: 'manager@example.test', mobile: '+91 98765 43212' },
    'Account administrator': { name: 'Admin', email: 'admin@example.test', mobile: '+91 98765 43213' },
    'Responsible person': { name: 'Reviewer', email: 'reviewer@example.test', mobile: '+91 98765 43214' },
  };

  return {
    agent: { name: agentName },
    task: taskObj,
    dsc: dscObj,
    license: licenseObj,
    event: module === 'DSC' ? dscObj : module === 'License' ? licenseObj : taskObj,
    recipient: recipientData[recipientRole] || recipientData.Client,
    client,
    clientName: client.name,
    clientEmail: client.email,
    clientMobile: client.mobile,
    your_firm_name: 'Ayatrio Practice',
    expense_name: 'Design Assets',
    expense_amount: '₹ 15,000',
    reviewer_name: 'Sample Reviewer',
    task_status: 'In Progress',
  };
}

export const StatusIcons = { Clock3, PlayCircle, PauseCircle };
