'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, Save, Send, Users, Waypoints, Radio, Settings2 } from 'lucide-react';
import {
  useAgent,
  useAgentDefinitions,
  useCreateAgent,
  usePublishAgent,
  useUpdateAgent,
} from '@/hooks/useAgentCenterQuery';
import {
  AgentAction,
  AgentChannel,
  AgentConfigDraft,
  AgentModule,
  AgentRecipient,
  AgentStatus,
  TriggerDefinition,
} from '@/types/agentCenter';
import { AgentPageTitle, NoticeBanner, Panel } from './shared';

type Props = { initialModule?: AgentModule; agentId?: string };
type StepKey = 'event' | 'recipient' | 'channel' | 'action';

const STEPS: Array<{ key: StepKey; title: string; subtitle: string; icon: React.ReactNode }> = [
  { key: 'event', title: 'Event', subtitle: 'When should it run?', icon: <Waypoints className="h-4 w-4" /> },
  { key: 'recipient', title: 'Recipient', subtitle: 'Who should be notified?', icon: <Users className="h-4 w-4" /> },
  { key: 'channel', title: 'Channel', subtitle: 'Where would it go?', icon: <Radio className="h-4 w-4" /> },
  { key: 'action', title: 'Action', subtitle: 'Message and action details', icon: <Settings2 className="h-4 w-4" /> },
];

const STEP_SEQUENCE: StepKey[] = STEPS.map((step) => step.key);

const inputClass = 'mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2';
const controlStyle = { borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' } as const;

function recipientArray(value: unknown): AgentRecipient[] {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.filter((item): item is AgentRecipient => typeof item === 'string') as AgentRecipient[];
}

function triggerFor(config: AgentConfigDraft, module: AgentModule, definitions: ReturnType<typeof useAgentDefinitions>['data']): TriggerDefinition | undefined {
  if (!definitions || typeof config.trigger !== 'string') return undefined;
  return definitions.modules[module]?.triggers.find((trigger) => trigger.value === config.trigger);
}

function getCondition(config: AgentConfigDraft, trigger?: TriggerDefinition): number | undefined {
  const key = trigger?.condition?.key;
  if (!key || !config.conditions || typeof config.conditions !== 'object') return undefined;
  const value = (config.conditions as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : value === undefined ? undefined : Number(value);
}

function summarizeConfig(config: AgentConfigDraft) {
  const recipients = recipientArray(config.recipient);
  return [
    ['Trigger', typeof config.trigger === 'string' ? config.trigger : 'Not selected'],
    ['Recipients', recipients.length ? recipients.join(', ') : 'None selected'],
    ['Channel', typeof config.channel === 'string' ? config.channel : 'Not selected'],
    ['Action', typeof config.action === 'string' ? config.action : 'Not selected'],
  ];
}

function previewText(message: string, module: AgentModule, recipient: AgentRecipient) {
  const sampleEvent: Record<string, unknown> = module === 'Task'
    ? { task: { id: 'TASK-1001', title: 'Prepare monthly compliance report', dueDate: '2026-01-15' } }
    : module === 'DSC'
      ? { dsc: { id: 'DSC-2001', holder: 'Sample User', expiryDate: '2026-02-01' } }
      : { license: { id: 'LIC-3001', name: 'Sample Trade License', expiryDate: '2026-02-01' } };
  const recipientData: Record<AgentRecipient, { name: string; address: string }> = {
    'Assigned user': { name: 'Sample User', address: 'sample.user@example.test' },
    'Task owner': { name: 'Sample Manager', address: 'sample.manager@example.test' },
    'Account administrator': { name: 'Account Administrator', address: 'admin@example.test' },
    'Responsible person': { name: 'Responsible Person', address: 'responsible@example.test' },
  };
  const variables = { ...sampleEvent, event: sampleEvent[module.toLowerCase()] || {}, recipient: recipientData[recipient], agent: { name: 'Sample Agent' } };
  return message.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, path: string) => {
    const value = path.split('.').reduce<unknown>((source, key) => source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined, variables);
    return value === undefined || value === null ? match : String(value);
  });
}

export default function AgentForm({ initialModule = 'Task', agentId }: Props) {
  const router = useRouter();
  const definitionsQuery = useAgentDefinitions();
  const agentQuery = useAgent(agentId || '');
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const publishMutation = usePublishAgent();
  const [loadedAgentId, setLoadedAgentId] = useState<string | null>(null);
  const [module, setModule] = useState<AgentModule>(initialModule);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<AgentConfigDraft>({});
  const [activeStep, setActiveStep] = useState<StepKey>('event');
  const [confirmedSteps, setConfirmedSteps] = useState<Partial<Record<StepKey, boolean>>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localError, setLocalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const definitions = definitionsQuery.data;

  useEffect(() => {
    if (!agentId || !agentQuery.data || loadedAgentId === agentQuery.data.id) return;
    const agent = agentQuery.data;
    // Intentional form hydration from asynchronously fetched agent data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(agent.name);
    setDescription(agent.description || '');
    setModule(agent.module);
    const stored = (agent.config || {}) as AgentConfigDraft;
    setConfig({ ...stored, recipient: recipientArray(stored.recipient) });
    setLoadedAgentId(agent.id);
  }, [agentId, agentQuery.data, loadedAgentId]);

  useEffect(() => {
    if (!definitions || agentId) return;
    // Intentional initialization of the new-agent form after definitions load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig((current) => {
      if (typeof current.trigger === 'string' && current.trigger) return current;
      const first = definitions.modules[module]?.triggers[0];
      const conditions = first?.condition ? { [first.condition.key]: first.condition.default } : {};
      return {
        trigger: first?.value || '',
        conditions,
        recipient: [],
        channel: 'Email',
        action: 'Send notification',
        message: definitions.modules[module]?.defaultMessage || '',
      };
    });
  }, [definitions, module, agentId]);

  const trigger = triggerFor(config, module, definitions);
  const conditionValue = getCondition(config, trigger) ?? trigger?.condition?.default;
  const selectedRecipients = recipientArray(config.recipient);
  const selectedChannel = typeof config.channel === 'string' ? config.channel : '';
  const selectedAction = typeof config.action === 'string' ? config.action : '';
  const message = typeof config.message === 'string' ? config.message : '';

  const eventStepValid = Boolean(trigger && (!trigger.condition || (Number.isInteger(conditionValue) && (conditionValue ?? 0) >= trigger.condition.min && (conditionValue ?? 0) <= trigger.condition.max)));
  const recipientStepValid = selectedRecipients.length > 0 && selectedRecipients.every((recipient) => definitions?.recipients.includes(recipient));
  const channelStepValid = Boolean(selectedChannel && definitions?.channels.includes(selectedChannel as AgentChannel));
  const actionStepValid = Boolean(selectedAction && definitions?.actions.includes(selectedAction as AgentAction) && message.trim() && message.trim().length <= 1000);

  const complete = Boolean(
    definitions
      && name.trim()
      && name.trim().length <= 100
      && description.length <= 500
      && trigger
      && (!trigger.condition || eventStepValid)
      && recipientStepValid
      && channelStepValid
      && actionStepValid
  );

  const lifecycleStatus: AgentStatus | undefined = agentQuery.data?.status;
  const readOnly = Boolean(agentId && lifecycleStatus && lifecycleStatus !== 'draft');

  function invalidateDownstreamSteps(stepKey: StepKey) {
    setConfirmedSteps((current) => {
      const next: Partial<Record<StepKey, boolean>> = { ...current };
      const startIndex = STEP_SEQUENCE.indexOf(stepKey);
      STEP_SEQUENCE.slice(startIndex).forEach((key) => { delete next[key]; });
      return next;
    });
  }

  function patchConfig(patch: Record<string, unknown>) {
    setConfig((current) => ({ ...current, ...patch }) as AgentConfigDraft);
    const relevantStepKeys = Object.keys(patch).reduce<StepKey[]>((steps, key) => {
      if (key === 'trigger' || key === 'conditions') return [...steps, 'event'];
      if (key === 'recipient') return [...steps, 'recipient'];
      if (key === 'channel') return [...steps, 'channel'];
      if (key === 'action' || key === 'message') return [...steps, 'action'];
      return steps;
    }, []);
    if (relevantStepKeys.length > 0) {
      const firstAffectedIndex = Math.min(...relevantStepKeys.map((key) => STEP_SEQUENCE.indexOf(key)));
      invalidateDownstreamSteps(STEP_SEQUENCE[firstAffectedIndex]);
    }
    setLocalError('');
    setNotice(null);
  }

  function stepValidity(stepKey: StepKey) {
    switch (stepKey) {
      case 'event':
        return Boolean(trigger && (!trigger.condition || (Number.isInteger(conditionValue) && (conditionValue ?? 0) >= trigger.condition.min && (conditionValue ?? 0) <= trigger.condition.max)));
      case 'recipient':
        return recipientStepValid;
      case 'channel':
        return channelStepValid;
      case 'action':
        return actionStepValid;
      default:
        return false;
    }
  }

  function isStepUnlocked(stepKey: StepKey) {
    const index = STEP_SEQUENCE.indexOf(stepKey);
    if (index <= 0) return true;
    return STEP_SEQUENCE.slice(0, index).every((candidate) => {
      const key = candidate as StepKey;
      return stepValidity(key) && Boolean(confirmedSteps[key]);
    });
  }

  function validateStep(stepKey: StepKey) {
    switch (stepKey) {
      case 'event':
        if (!trigger) {
          setLocalError('Select a valid event trigger before continuing.');
          return false;
        }
        if (trigger.condition && !stepValidity('event')) {
          setLocalError(`Enter an integer between ${trigger.condition.min} and ${trigger.condition.max} for ${trigger.condition.label}.`);
          return false;
        }
        return true;
      case 'recipient':
        if (!recipientStepValid) {
          setLocalError('Select at least one valid recipient before continuing.');
          return false;
        }
        return true;
      case 'channel':
        if (!channelStepValid) {
          setLocalError('Select a valid channel before continuing.');
          return false;
        }
        return true;
      case 'action':
        if (!selectedAction || !definitions?.actions.includes(selectedAction as AgentAction)) {
          setLocalError('Select a valid action before continuing.');
          return false;
        }
        if (!message.trim()) {
          setLocalError('Add a message before continuing.');
          return false;
        }
        if (message.trim().length > 1000) {
          setLocalError('The message must be 1,000 characters or fewer.');
          return false;
        }
        return true;
      default:
        return false;
    }
  }

  function confirmStep(stepKey: StepKey) {
    if (!validateStep(stepKey)) return false;
    setConfirmedSteps((current) => ({ ...current, [stepKey]: true }));
    const currentIndex = STEP_SEQUENCE.indexOf(stepKey);
    const nextKey = STEP_SEQUENCE[currentIndex + 1];
    if (nextKey) {
      setActiveStep(nextKey);
      setLocalError('');
    }
    return true;
  }

  function moveToStep(stepKey: StepKey) {
    if (!isStepUnlocked(stepKey)) {
      const previousStep = STEP_SEQUENCE.slice(0, STEP_SEQUENCE.indexOf(stepKey)).reverse().find((candidate) => isStepUnlocked(candidate as StepKey)) ?? 'event';
      setLocalError('Complete the previous step first.');
      setActiveStep(previousStep as StepKey);
      return;
    }
    setActiveStep(stepKey);
    setLocalError('');
  }

  function changeModule(nextModule: AgentModule) {
    const definition = definitions?.modules[nextModule];
    const nextTrigger = definition?.triggers[0];
    setModule(nextModule);
    setConfig((current) => ({
      trigger: nextTrigger?.value || '',
      conditions: nextTrigger?.condition ? { [nextTrigger.condition.key]: nextTrigger.condition.default } : {},
      recipient: recipientArray(current.recipient),
      channel: (typeof current.channel === 'string' ? current.channel : 'Email') as AgentChannel,
      action: (typeof current.action === 'string' ? current.action : 'Send notification') as AgentConfigDraft['action'],
      message: definition?.defaultMessage || '',
    }));
    setConfirmedSteps({});
    setActiveStep('event');
    setPreviewOpen(false);
    setLocalError('');
    setNotice(null);
  }

  async function submit(shouldPublish: boolean) {
    setLocalError('');
    setNotice(null);
    if (!name.trim()) { setLocalError('Agent name is required.'); return; }
    if (name.trim().length > 100) { setLocalError('Agent name must be 100 characters or fewer.'); return; }
    if (description.length > 500) { setLocalError('Description must be 500 characters or fewer.'); return; }
    if (shouldPublish && !complete) {
      setLocalError('Complete all four steps before publishing. Check the event condition, recipient, channel, action and message.');
      setActiveStep(!trigger ? 'event' : selectedRecipients.length === 0 ? 'recipient' : !selectedChannel ? 'channel' : 'action');
      return;
    }
    setBusy(true);
    let savedId = agentId;
    try {
      const payload = { name: name.trim(), module, description: description.trim(), config, saveDraft: !shouldPublish };
      if (agentId) {
        await updateMutation.mutateAsync({ id: agentId, payload });
        savedId = agentId;
      } else {
        const created = await createMutation.mutateAsync(payload);
        savedId = created.id;
      }
      if (shouldPublish && savedId) await publishMutation.mutateAsync(savedId);
      if (savedId) router.push(`/agents/detail?id=${encodeURIComponent(savedId)}`);
      else router.push('/agents');
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : 'Could not save the agent.';
      setLocalError(messageText);
      if (savedId && shouldPublish) setNotice({ type: 'info', text: 'The draft was saved, but publishing did not complete. You can open the saved draft and retry.' });
    } finally {
      setBusy(false);
    }
  }

  if (agentId && agentQuery.isLoading) {
    return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading agent configuration…</div>;
  }
  if (agentId && agentQuery.isError) {
    return <div className="mx-auto max-w-3xl p-6"><NoticeBanner type="error">Agent details could not be loaded. {agentQuery.error instanceof Error ? agentQuery.error.message : ''}</NoticeBanner><button type="button" onClick={() => void agentQuery.refetch()} className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Retry</button></div>;
  }
  if (agentId && agentQuery.data && agentQuery.data.status !== 'draft') {
    return <div className="mx-auto max-w-3xl p-6"><NoticeBanner type="info">Only draft agents can be edited. This agent is {agentQuery.data.status}.</NoticeBanner><Link href={`/agents/detail?id=${encodeURIComponent(agentId)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}><ArrowLeft className="h-4 w-4" /> Return to agent details</Link></div>;
  }
  if (definitionsQuery.isLoading) return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading agent definitions…</div>;
  if (definitionsQuery.isError || !definitions) return <div className="mx-auto max-w-3xl p-6"><NoticeBanner type="error">Agent definitions could not be loaded. Check the backend connection; the builder relies on backend definitions for valid triggers and options.</NoticeBanner><button type="button" onClick={() => void definitionsQuery.refetch()} className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Retry</button></div>;

  const headerAction = <Link href={agentId ? `/agents/detail?id=${encodeURIComponent(agentId)}` : '/agents'} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><ArrowLeft className="h-4 w-4" /> Cancel</Link>;
  return (
    <div className="mx-auto w-full max-w-[1250px] p-4 md:p-6 lg:p-8">
      <AgentPageTitle eyebrow={agentId ? 'Draft configuration' : 'Workflow builder'} title={agentId ? 'Edit agent' : 'Create agent'} description="Choose one event, one or more recipients, a single channel and an action. Preview is local only." action={headerAction} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-xs" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
        <span className="rounded-full px-2 py-1 font-bold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>SIMULATION ONLY</span>
        <span>Published agent test runs still use fictional sample data and mock providers. Nothing is delivered to a real recipient.</span>
      </div>
      {notice && <div className="mb-4"><NoticeBanner type={notice.type}>{notice.text}</NoticeBanner></div>}
      {localError && <div className="mb-4"><NoticeBanner type="error">{localError}</NoticeBanner></div>}

      <Panel title="Agent details" description="The agent starts in Draft. Publishing runs strict server-side validation.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Agent name <span className="text-rose-600">*</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={readOnly} placeholder="e.g. Task due reminder" className={inputClass} style={controlStyle} /><span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{name.length}/100</span></label>
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Module <span className="text-rose-600">*</span><select value={module} onChange={(event) => changeModule(event.target.value as AgentModule)} disabled={readOnly || Boolean(agentId)} className={inputClass} style={controlStyle}>{Object.keys(definitions.modules).map((key) => <option key={key} value={key}>{key}</option>)}</select><span className="mt-1 block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{definitions.modules[module].description}</span></label>
          <label className="block text-sm font-semibold md:col-span-2" style={{ color: 'var(--text-main)' }}>Description <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={2} disabled={readOnly} placeholder="What this agent is intended to do" className={inputClass} style={controlStyle} /><span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{description.length}/500</span></label>
        </div>
      </Panel>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, index) => {
              const selected = activeStep === step.key;
              const isLocked = !isStepUnlocked(step.key);
              const isConfirmed = Boolean(confirmedSteps[step.key]) && stepValidity(step.key);
              const isComplete = step.key === 'event' ? eventStepValid : step.key === 'recipient' ? recipientStepValid : step.key === 'channel' ? channelStepValid : actionStepValid;
              return <button key={step.key} type="button" disabled={readOnly || isLocked} onClick={() => moveToStep(step.key)} title={isLocked ? 'Complete the previous step first.' : undefined} className="rounded-xl border p-4 text-left transition-shadow hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: selected ? 'var(--primary)' : isLocked ? 'var(--border-main)' : 'var(--border-main)', backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-surface)', opacity: isLocked ? 0.8 : 1 }}><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: selected ? 'var(--primary)' : isLocked ? 'var(--text-muted)' : 'var(--text-muted)' }}>{step.icon} Step {index + 1}</span>{isConfirmed && <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" /></span>}</div><h2 className="mt-3 font-bold" style={{ color: 'var(--text-main)' }}>{step.title}</h2><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{step.subtitle}</p>{isLocked && <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Complete the previous step first.</p>}{!isLocked && isComplete && !isConfirmed && <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Ready to confirm.</p>}</button>;
            })}
          </div>

          <div className="mt-4 rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-main)' }}>
            {activeStep === 'event' && <div className="space-y-4"><div><h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Configure event</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose one trigger supported by the selected module.</p></div><label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Trigger<select value={typeof config.trigger === 'string' ? config.trigger : ''} disabled={readOnly} onChange={(event) => { const next = definitions.modules[module].triggers.find((item) => item.value === event.target.value); patchConfig({ trigger: event.target.value, conditions: next?.condition ? { [next.condition.key]: next.condition.default } : {} }); }} className={inputClass} style={controlStyle}><option value="">Select an event</option>{definitions.modules[module].triggers.map((item) => <option key={item.value} value={item.value}>{item.value}</option>)}</select></label>{trigger?.condition && <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}><label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{trigger.condition.label}<input type="number" min={trigger.condition.min} max={trigger.condition.max} step={1} value={conditionValue ?? trigger.condition.default} disabled={readOnly} onChange={(event) => patchConfig({ conditions: { [trigger.condition!.key]: event.target.value === '' ? undefined : Number(event.target.value) } })} className={inputClass} style={controlStyle} /></label><p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Whole number from {trigger.condition.min} to {trigger.condition.max}. Default: {trigger.condition.default}.</p></div>}<p className="text-xs" style={{ color: 'var(--text-muted)' }}>Test runs create a fixed sample event. This is not connected to the live Task, DSC or License records yet.</p></div>}

            {activeStep === 'recipient' && <div className="space-y-4"><div><h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Select recipients</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose one or more role-based demo recipients.</p></div><div className="grid gap-2 sm:grid-cols-2">{definitions.recipients.map((recipient) => { const selected = selectedRecipients.includes(recipient); return <label key={recipient} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4" style={{ borderColor: selected ? 'var(--primary)' : 'var(--border-main)', backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-surface)' }}><input type="checkbox" checked={selected} disabled={readOnly} onChange={(event) => patchConfig({ recipient: event.target.checked ? [...selectedRecipients, recipient] : selectedRecipients.filter((item) => item !== recipient) })} className="mt-0.5 h-4 w-4 accent-blue-700" /><span><span className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{recipient}</span><span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Demo identity used by simulation only</span></span></label>; })}</div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedRecipients.length} recipient role{selectedRecipients.length === 1 ? '' : 's'} selected. Their order is preserved in test results.</p></div>}

            {activeStep === 'channel' && <div className="space-y-4"><div><h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Choose a channel</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>The backend accepts exactly one channel per agent.</p></div><div className="grid gap-3 md:grid-cols-3">{definitions.channels.map((channel) => { const selected = selectedChannel === channel; const blurb = channel === 'Email' ? 'Mock email provider' : channel === 'WhatsApp' ? 'Mock WhatsApp provider' : 'Mock in-app provider'; return <button key={channel} type="button" disabled={readOnly} onClick={() => patchConfig({ channel })} className="rounded-xl border p-4 text-left" style={{ borderColor: selected ? 'var(--primary)' : 'var(--border-main)', backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-surface)' }}><span className="flex items-center justify-between gap-2"><span className="font-bold" style={{ color: 'var(--text-main)' }}>{channel}</span><span className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-blue-700' : 'border-slate-300'}`}>{selected && <span className="m-0.5 block h-2 w-2 rounded-full bg-blue-700" />}</span></span><span className="mt-2 block text-xs" style={{ color: 'var(--text-muted)' }}>{blurb}</span></button>; })}</div><NoticeBanner type="info">No credentials or delivery provider are configured here. Channel selection affects the simulated result only.</NoticeBanner></div>}

            {activeStep === 'action' && <div className="space-y-4"><div><h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Configure action</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose a notification action and define its message template.</p></div><label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Action<select value={selectedAction} disabled={readOnly} onChange={(event) => patchConfig({ action: event.target.value })} className={inputClass} style={controlStyle}><option value="">Select an action</option>{definitions.actions.map((action) => <option key={action} value={action}>{action}</option>)}</select></label><label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Message template <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(maximum 1,000 characters)</span><textarea value={message} disabled={readOnly} maxLength={1000} rows={6} onChange={(event) => patchConfig({ message: event.target.value })} placeholder="Your task {{task.title}} needs your attention." className={inputClass} style={controlStyle} /><span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{message.length}/1000</span></label><div className="rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-main)' }}>Template variables:</strong> {'{{task.title}}'}, {'{{dsc.expiryDate}}'}, {'{{license.name}}'}, {'{{recipient.name}}'}, {'{{recipient.address}}'}, {'{{trigger}}'}.</div></div>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-main)' }}><div className="flex gap-2">{STEPS.map((step) => <button key={step.key} type="button" aria-label={`Go to ${step.title}`} disabled={!isStepUnlocked(step.key)} onClick={() => moveToStep(step.key)} className="h-2.5 w-2.5 rounded-full disabled:cursor-not-allowed" style={{ backgroundColor: step.key === activeStep ? 'var(--primary)' : 'var(--border-strong)', opacity: !isStepUnlocked(step.key) ? 0.45 : 1 }} />)}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={readOnly} onClick={() => setPreviewOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><Eye className="h-4 w-4" /> {previewOpen ? 'Hide preview' : 'Preview message'}</button>{activeStep !== 'event' && <button type="button" onClick={() => { const index = STEP_SEQUENCE.indexOf(activeStep); const previousKey = STEP_SEQUENCE[Math.max(0, index - 1)]; moveToStep(previousKey); }} className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Previous</button>}{activeStep !== 'action' ? <button type="button" onClick={() => { const currentStepKey = activeStep; const currentIndex = STEP_SEQUENCE.indexOf(currentStepKey); if (!confirmStep(currentStepKey)) return; const nextKey = STEP_SEQUENCE[currentIndex + 1]; if (nextKey) setActiveStep(nextKey); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--primary)' }}>Next</button> : <button type="button" onClick={() => { if (!confirmStep('action')) return; setNotice({ type: 'success', text: 'Action confirmed. The workflow is ready to save or publish.' }); setPreviewOpen(true); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--primary)' }}>Done</button>}</div></div>
          </div>

          {previewOpen && <div className="mt-4"><Panel title="Message preview" description="Local rendering against fictional sample data; it does not call the backend or create a run record.">{selectedRecipients.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select at least one recipient to view a preview.</p> : <div className="grid gap-3 md:grid-cols-2">{selectedRecipients.map((recipient) => <div key={recipient} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)' }}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{recipient}</p><span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>{selectedChannel || 'No channel'}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--text-main)' }}>{previewText(message, module, recipient)}</p><p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Action: {selectedAction || 'Not selected'}</p></div>)}</div>}</Panel></div>}
        </div>

        <aside className="space-y-4">
          <Panel title="Workflow summary" description="Current configuration at a glance."><div className="space-y-3">{summarizeConfig(config).map(([label, value]) => <div key={label} className="border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: 'var(--border-main)' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p><p className="mt-1 break-words text-sm font-medium" style={{ color: 'var(--text-main)' }}>{value}</p></div>)}</div><div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}><span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${complete ? 'bg-emerald-500' : 'bg-amber-500'}`} />{complete ? 'All required fields look complete.' : 'Some required fields are still missing.'}</div></Panel>
          <Panel title="Save and publish" description="Drafts may be incomplete. Publishing requires a complete configuration."><div className="space-y-2"><button type="button" disabled={busy || readOnly} onClick={() => void submit(false)} className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save as draft'}</button><button type="button" disabled={busy || readOnly || !complete} onClick={() => void submit(true)} className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}><Send className="h-4 w-4" /> {busy ? 'Working…' : 'Publish agent'}</button></div><p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Publishing changes the status to Published. Testing remains simulated; no scheduler is attached.</p></Panel>
        </aside>
      </div>
    </div>
  );
}
