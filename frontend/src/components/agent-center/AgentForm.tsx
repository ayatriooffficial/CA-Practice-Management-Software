'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Eye, Lock, Pencil, Radio, Save, Send, Settings2, Users, Waypoints } from 'lucide-react';
import {
  useAgent,
  useCreateAgent,
  usePublishAgent,
  useUpdateAgent,
} from '@/hooks/useAgentCenterQuery';
import { getPublicDefinitions } from '../../../../backend/src/modules/agentCenter/definitions';
import {
  AgentAction,
  AgentChannel,
  AgentConfigDraft,
  AgentDefinitions,
  AgentModule,
  AgentRecipient,
  AgentStatus,
  TriggerDefinition,
} from '@/types/agentCenter';
import { AgentPageTitle, NoticeBanner, Panel } from './shared';
import WorkflowGraphEditor from './WorkflowGraphEditor';
import { WorkflowGraph } from '@/types/agentCenter';
import { TaskItem } from '@/data/taskData';
import { request } from '@/services/apiClient';
import {
  commitWorkflowStage,
  invalidateWorkflowStagesFrom,
  isWorkflowStageUnlocked,
  restoreWorkflowStageProgress,
  WorkflowStage,
  WorkflowStageProgress,
} from './workflowStageProgress';

type Props = { initialModule?: AgentModule; agentId?: string };
type StepKey = WorkflowStage;
const PUBLIC_DEFINITIONS = getPublicDefinitions() as unknown as AgentDefinitions;

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

function triggerFor(config: AgentConfigDraft, module: AgentModule, definitions: AgentDefinitions): TriggerDefinition | undefined {
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
    ['Email template', typeof config.templateId === 'string' ? config.templateId : 'Custom message'],
  ];
}

function previewText(message: string, module: AgentModule, recipient: AgentRecipient, selectedTask?: TaskItem) {
  const task = selectedTask || { id: 'TASK-1001', taskId: 'TASK-1001', taskName: 'Prepare monthly compliance report', clientName: 'Sample Company', priority: 'High' as const, status: 'In Progress' as const, targetDueDate: '2026-01-15', assigneeName: 'Sample User', reviewerName: 'Sample Reviewer', creatorName: 'Sample Manager' };
  const sampleEvent: Record<string, unknown> = module === 'Task'
    ? { task: { id: task.taskId || task.id, taskName: task.taskName, clientName: task.clientName, priority: task.priority, status: task.status, targetDueDate: task.targetDueDate, assigneeName: task.assigneeName, reviewerName: task.reviewerName, creatorName: task.creatorName } }
    : module === 'DSC'
      ? { dsc: { id: 'DSC-2001', holder: 'Sample User', expiryDate: '2026-02-01' } }
      : { license: { id: 'LIC-3001', name: 'Sample Trade License', expiryDate: '2026-02-01' } };
  const recipientData: Record<AgentRecipient, { name: string; address: string }> = {
    Client: { name: 'Sample Company', address: 'client@example.test' },
    'Assigned user': { name: 'Sample User', address: 'sample.user@example.test' },
    'Task owner': { name: 'Sample Manager', address: 'sample.manager@example.test' },
    'Account administrator': { name: 'Account Administrator', address: 'admin@example.test' },
    'Responsible person': { name: 'Responsible Person', address: 'responsible@example.test' },
  };
  const client = module === 'Task' ? { name: task.clientName, email: selectedTask ? undefined : 'client@example.test' } : undefined;
  const variables = { ...sampleEvent, event: sampleEvent[module.toLowerCase()] || {}, recipient: recipientData[recipient], client, agent: { name: 'Sample Agent' } };
  return message.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, path: string) => {
    const value = path.split('.').reduce<unknown>((source, key) => source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined, variables);
    return value === undefined || value === null ? match : String(value);
  });
}

function unsupportedVariables(text: string, allowed: string[]) {
  return [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1]).filter((variable) => !allowed.includes(variable));
}

function graphIsValid(graph: WorkflowGraph, module: AgentModule, definitions: AgentDefinitions) {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  if (nodes.length > 12 || edges.length > 32 || edges.some((item) => !nodes.some((node) => node.id === item.source) || (item.target !== '__end__' && !nodes.some((node) => node.id === item.target)))) return false;
  if (nodes.some((node) => !node.id || !node.name.trim() || !['action', 'condition'].includes(node.type))) return false;
  for (const node of nodes) {
    const outputs = edges.filter((item) => item.source === node.id);
    if (node.type === 'condition') {
      if (!outputs.some((item) => item.sourceHandle === 'true') || !outputs.some((item) => item.sourceHandle === 'false') || outputs.length !== 2) return false;
      if (!node.config.field || !node.config.operator || (node.config.operator !== 'exists' && String(node.config.value ?? '').trim() === '')) return false;
    } else if (!node.config.message || !node.config.recipient || !definitions.recipients.includes(node.config.recipient as AgentRecipient) || !definitions.channels.includes(node.config.channel as AgentChannel) || !definitions.actions.includes(node.config.action as AgentAction) || String(node.config.message).trim().length > 1000 || (node.config.channel === 'Email' && (!String(node.config.subject || '').trim() || String(node.config.subject).length > 200)) || unsupportedVariables(`${String(node.config.subject || node.config.action || '')}\n${String(node.config.message || '')}`, definitions.templateVariables).length > 0 || (node.config.recipient === 'Client' && module !== 'Task')) return false;
    if (node.type === 'action' && outputs.length > 1) return false;
  }
  if (nodes.length && !nodes.some((node) => node.type === 'action')) return false;
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const item of edges.filter((candidate) => candidate.source === id && candidate.target !== '__end__')) if (!visit(item.target)) return false;
    visiting.delete(id); visited.add(id); return true;
  };
  return nodes.length === 0 || (visit(nodes[0].id) && visited.size === nodes.length);
}

export default function AgentForm({ initialModule = 'Task', agentId }: Props) {
  const router = useRouter();
  const agentQuery = useAgent(agentId || '');
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const publishMutation = usePublishAgent();
  const [loadedAgentId, setLoadedAgentId] = useState<string | null>(null);
  const [savedAgentId, setSavedAgentId] = useState(agentId || '');
  const [module, setModule] = useState<AgentModule>(initialModule);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<AgentConfigDraft>({});
  const [activeStep, setActiveStep] = useState<StepKey>('event');
  const [confirmedSteps, setConfirmedSteps] = useState<Partial<Record<StepKey, boolean>>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreviewTaskId, setSelectedPreviewTaskId] = useState('');
  const [localError, setLocalError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const definitions = PUBLIC_DEFINITIONS;
  const previewTasksQuery = useQuery({
    queryKey: ['agent-center-preview-tasks'],
    queryFn: async () => {
      const response = await request<TaskItem[]>('/tasks?limit=100&sortBy=updatedAt&sortOrder=desc');
      if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || 'Unable to load authorized Tasks for preview.');
      return response.data;
    },
    enabled: previewOpen && module === 'Task',
    staleTime: 60_000,
    retry: false,
  });
  const selectedPreviewTask = previewTasksQuery.data?.find((task) => task.id === selectedPreviewTaskId || task.taskId === selectedPreviewTaskId);

  useEffect(() => {
    if (!agentId || !agentQuery.data || loadedAgentId === agentQuery.data.id) return;
    const agent = agentQuery.data;
    // Intentional form hydration from asynchronously fetched agent data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(agent.name);
    setDescription(agent.description || '');
    setModule(agent.module);
    const stored = (agent.config || {}) as AgentConfigDraft;
    setConfig({ ...stored, recipient: recipientArray(stored.recipient), subject: stored.subject || (typeof stored.action === 'string' ? stored.action : ''), templateId: stored.templateId || 'custom', workflowGraph: stored.workflowGraph || { nodes: [], edges: [] } });
    setSavedAgentId(agent.id);
    const storedTrigger = triggerFor(stored, agent.module, definitions);
    const storedConditionValue = getCondition(stored, storedTrigger) ?? storedTrigger?.condition?.default;
    const storedRecipients = recipientArray(stored.recipient);
    const storedChannel = typeof stored.channel === 'string' ? stored.channel : '';
    const storedAction = typeof stored.action === 'string' ? stored.action : '';
    const storedSubject = typeof stored.subject === 'string' ? stored.subject : storedAction;
    const storedMessage = typeof stored.message === 'string' ? stored.message : '';
    const storedGraph = (stored.workflowGraph && typeof stored.workflowGraph === 'object' ? stored.workflowGraph : { nodes: [], edges: [] }) as WorkflowGraph;
    setConfirmedSteps(restoreWorkflowStageProgress({
      event: Boolean(storedTrigger && storedTrigger.runtimeAvailable !== false && (!storedTrigger.condition || (Number.isInteger(storedConditionValue) && (storedConditionValue ?? 0) >= storedTrigger.condition.min && (storedConditionValue ?? 0) <= storedTrigger.condition.max))),
      recipient: storedRecipients.length > 0 && storedRecipients.every((recipient) => definitions.recipients.includes(recipient)),
      channel: definitions.channels.includes(storedChannel as AgentChannel),
      action: Boolean(storedAction && definitions.actions.includes(storedAction as AgentAction) && storedMessage.trim() && storedMessage.trim().length <= 1000 && storedSubject.length <= 200 && (storedChannel !== 'Email' || storedSubject.trim()) && unsupportedVariables(`${storedSubject}\n${storedMessage}`, definitions.templateVariables).length === 0 && graphIsValid(storedGraph, agent.module, definitions)),
    }, stored.workflowStageProgress));
    setLoadedAgentId(agent.id);
  }, [agentId, agentQuery.data, loadedAgentId, definitions]);

  useEffect(() => {
    if (!definitions || agentId) return;
    // Intentional initialization of the new-agent form after definitions load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig((current) => {
      if (typeof current.trigger === 'string' && current.trigger) return current;
      const moduleTriggers = definitions.modules[module]?.triggers || [];
      const first = moduleTriggers.find((item) => item.runtimeAvailable !== false) || moduleTriggers[0];
      const conditions = first?.condition ? { [first.condition.key]: first.condition.default } : {};
      return {
        trigger: first?.value || '',
        conditions,
        recipient: [],
        channel: 'Email',
        action: 'Send notification',
        subject: `${module} update`,
        templateId: 'custom',
        message: definitions.modules[module]?.defaultMessage || '',
        workflowGraph: { nodes: [], edges: [] },
      };
    });
  }, [definitions, module, agentId]);

  const trigger = triggerFor(config, module, definitions);
  const conditionValue = getCondition(config, trigger) ?? trigger?.condition?.default;
  const selectedRecipients = recipientArray(config.recipient);
  const selectedChannel = typeof config.channel === 'string' ? config.channel : '';
  const selectedAction = typeof config.action === 'string' ? config.action : '';
  const message = typeof config.message === 'string' ? config.message : '';
  const subject = typeof config.subject === 'string' ? config.subject : selectedAction;
  const templateId = typeof config.templateId === 'string' ? config.templateId : 'custom';
  const selectedTemplate = module === 'Task' ? definitions.emailTemplates.find((template) => template.id === templateId) : undefined;
  const workflowGraph = (config.workflowGraph && typeof config.workflowGraph === 'object' ? config.workflowGraph : { nodes: [], edges: [] }) as WorkflowGraph;

  const eventStepValid = Boolean(trigger && trigger.runtimeAvailable !== false && (!trigger.condition || (Number.isInteger(conditionValue) && (conditionValue ?? 0) >= trigger.condition.min && (conditionValue ?? 0) <= trigger.condition.max)));
  const recipientStepValid = selectedRecipients.length > 0 && selectedRecipients.every((recipient) => definitions?.recipients.includes(recipient));
  const channelStepValid = Boolean(selectedChannel && definitions?.channels.includes(selectedChannel as AgentChannel));
  const actionStepValid = Boolean(selectedAction && definitions?.actions.includes(selectedAction as AgentAction) && message.trim() && message.trim().length <= 1000 && subject.length <= 200 && (selectedChannel !== 'Email' || subject.trim()) && unsupportedVariables(`${subject}\n${message}`, definitions.templateVariables).length === 0);

  const complete = Boolean(
    definitions
      && name.trim()
      && name.trim().length <= 100
      && description.length <= 500
      && trigger
      && eventStepValid
      && recipientStepValid
      && channelStepValid
      && actionStepValid
      && graphIsValid(workflowGraph, module, definitions)
      && STEP_SEQUENCE.every((step) => confirmedSteps[step] === true)
  );

  const lifecycleStatus: AgentStatus | undefined = agentQuery.data?.status;
  const readOnly = Boolean(agentId && lifecycleStatus && lifecycleStatus !== 'draft');

  function patchConfig(patch: Record<string, unknown>) {
    setConfig((current) => ({ ...current, ...patch }) as AgentConfigDraft);
    const relevantStepKeys = Object.keys(patch).reduce<StepKey[]>((steps, key) => {
      if (key === 'trigger' || key === 'conditions') return [...steps, 'event'];
      if (key === 'recipient') return [...steps, 'recipient'];
      if (key === 'channel') return [...steps, 'channel'];
      if (key === 'action' || key === 'message' || key === 'subject' || key === 'templateId' || key === 'workflowGraph') return [...steps, 'action'];
      return steps;
    }, []);
    if (relevantStepKeys.length > 0) {
      const firstAffectedIndex = Math.min(...relevantStepKeys.map((key) => STEP_SEQUENCE.indexOf(key)));
      setConfirmedSteps((current) => invalidateWorkflowStagesFrom(current, STEP_SEQUENCE[firstAffectedIndex]));
    }
    setLocalError('');
    setNotice(null);
  }

  function stepValidity(stepKey: StepKey) {
    switch (stepKey) {
      case 'event':
        return eventStepValid;
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

  function validateStep(stepKey: StepKey): string | undefined {
    switch (stepKey) {
      case 'event':
        if (!trigger) {
          return 'Select a valid event trigger before continuing.';
        }
        if (trigger.runtimeAvailable === false) {
          return trigger.supportReason || 'This trigger does not have a runtime event source yet.';
        }
        if (trigger.condition && !stepValidity('event')) {
          return `Enter an integer between ${trigger.condition.min} and ${trigger.condition.max} for ${trigger.condition.label}.`;
        }
        return undefined;
      case 'recipient':
        if (!recipientStepValid) {
          return 'Select at least one valid recipient before continuing.';
        }
        return undefined;
      case 'channel':
        if (!channelStepValid) {
          return 'Select a valid channel before continuing.';
        }
        return undefined;
      case 'action':
        if (!selectedAction || !definitions?.actions.includes(selectedAction as AgentAction)) {
          return 'Select a valid action before continuing.';
        }
        if (!message.trim()) {
          return 'Add a message before continuing.';
        }
        if (message.trim().length > 1000) {
          return 'The message must be 1,000 characters or fewer.';
        }
        if (subject.length > 200) {
          return 'Email subject must be 200 characters or fewer.';
        }
        if (selectedChannel === 'Email' && !subject.trim()) {
          return 'Add an email subject before continuing.';
        }
        const unsupported = unsupportedVariables(`${subject}\n${message}`, definitions?.templateVariables || [])[0];
        if (unsupported) {
          return `Template variable {{${unsupported}}} is not supported.`;
        }
        if (!graphIsValid(workflowGraph, module, definitions)) return 'Fix the connected graph: check all condition branches, connections, and action fields.';
        return undefined;
      default:
        return 'Unknown workflow stage.';
    }
  }

  function getStageSummary(stepKey: StepKey): string {
    switch (stepKey) {
      case 'event': {
        const cond = trigger?.condition && conditionValue !== undefined ? ` (${trigger.condition.label}: ${conditionValue})` : '';
        return `${trigger?.value || 'Event selected'}${cond}`;
      }
      case 'recipient':
        return selectedRecipients.length ? selectedRecipients.join(', ') : 'No recipient selected';
      case 'channel':
        return selectedChannel || 'No channel selected';
      case 'action':
        if (workflowGraph.nodes.length) {
          return `${workflowGraph.nodes.length} connected graph step${workflowGraph.nodes.length === 1 ? '' : 's'}`;
        }
        return `${selectedAction || 'Action selected'} · ${selectedTemplate?.name || 'Custom email'}`;
      default:
        return '';
    }
  }

  async function persistDraft(progressToSave: WorkflowStageProgress = confirmedSteps, nameOverride?: string) {
    const currentId = savedAgentId || agentId;
    const effectiveName = nameOverride !== undefined ? nameOverride : (name.trim() || `New ${module} Agent`);
    if (!name.trim() && nameOverride) {
      setName(nameOverride);
    }
    const configToSave = { ...config, workflowStageProgress: progressToSave };
    if (currentId) {
      const saved = await updateMutation.mutateAsync({
        id: currentId,
        payload: { name: effectiveName, module, description: description.trim(), config: configToSave, saveDraft: true },
      });
      setSavedAgentId(saved.id);
      return saved.id;
    }
    const saved = await createMutation.mutateAsync({ name: effectiveName, module, description: description.trim(), config: configToSave, saveDraft: true });
    setSavedAgentId(saved.id);
    if (typeof window !== 'undefined' && !agentId && saved?.id) {
      window.history.replaceState(null, '', `/agents/edit?id=${encodeURIComponent(saved.id)}`);
    }
    return saved.id;
  }

  async function confirmStep(stepKey: StepKey) {
    if (busyRef.current) return;
    setLocalError('');
    setNotice(null);

    // Apply default name only when necessary and only if the name field is still empty
    const effectiveName = name.trim() || `New ${module} Agent`;
    if (!name.trim()) {
      setName(effectiveName);
    }
    if (effectiveName.length > 100 || description.length > 500) {
      setLocalError('Check the agent name and description length before saving this stage.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const result = await commitWorkflowStage(
        stepKey,
        confirmedSteps,
        () => validateStep(stepKey),
        async () => {
          await persistDraft({ ...confirmedSteps, [stepKey]: true }, effectiveName);
        },
      );

      if (!result.ok) {
        setLocalError(result.message);
        return;
      }

      setConfirmedSteps(result.progress);
      setLocalError('');
      if (result.nextStage) {
        setActiveStep(result.nextStage);
      } else {
        setNotice({ type: 'success', text: 'All four stages are saved as a draft. Publish the workflow separately when you are ready.' });
        setPreviewOpen(true);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'An error occurred while saving this stage.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function moveToStep(stepKey: StepKey) {
    if (!isWorkflowStageUnlocked(stepKey, confirmedSteps) || busy) return;
    setActiveStep(stepKey);
    setLocalError('');
  }

  function updateRecipients(nextRecipients: AgentRecipient[]) {
    const selected = [...new Set(nextRecipients)];
    patchConfig({
      recipient: selected,
      recipientResolution: selected.includes('Client') ? { mode: 'task-linked-client', relationship: 'trigger-record' } : undefined,
    });
  }

  function changeModule(nextModule: AgentModule) {
    const definition = definitions?.modules[nextModule];
    const nextTrigger = definition?.triggers.find((item) => item.runtimeAvailable !== false) || definition?.triggers[0];
    setModule(nextModule);
    setConfig((current) => ({
      trigger: nextTrigger?.value || '',
      conditions: nextTrigger?.condition ? { [nextTrigger.condition.key]: nextTrigger.condition.default } : {},
      recipient: recipientArray(current.recipient).filter((recipient) => recipient !== 'Client'),
      recipientResolution: undefined,
      channel: (typeof current.channel === 'string' ? current.channel : 'Email') as AgentChannel,
      action: (typeof current.action === 'string' ? current.action : 'Send notification') as AgentConfigDraft['action'],
      message: definition?.defaultMessage || '',
      subject: `${nextModule} update`,
      templateId: 'custom',
      workflowGraph: { nodes: [], edges: [] },
    }));
    setConfirmedSteps({});
    setActiveStep('event');
    setPreviewOpen(false);
    setLocalError('');
    setNotice(null);
  }

  async function submit(shouldPublish: boolean) {
    if (busyRef.current) return;
    setLocalError('');
    setNotice(null);
    if (!name.trim()) { setLocalError('Agent name is required.'); return; }
    if (name.trim().length > 100) { setLocalError('Agent name must be 100 characters or fewer.'); return; }
    if (description.length > 500) { setLocalError('Description must be 500 characters or fewer.'); return; }
    if (shouldPublish && !complete) {
      setLocalError(!eventStepValid && trigger?.runtimeAvailable === false
        ? `${trigger.value} cannot be published: ${trigger.supportReason || 'runtime prerequisite is missing.'}`
        : 'Complete all four stages before publishing. Check the event condition, recipient, channel, action and message.');
      setActiveStep(!trigger || !eventStepValid ? 'event' : !recipientStepValid ? 'recipient' : !channelStepValid ? 'channel' : 'action');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    let savedId = savedAgentId || agentId;
    try {
      savedId = await persistDraft();
      if (shouldPublish && savedId) await publishMutation.mutateAsync(savedId);
      if (savedId) router.push(`/agents/detail?id=${encodeURIComponent(savedId)}`);
      else router.push('/agents');
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : 'Could not save the agent.';
      setLocalError(messageText);
      if (savedId && shouldPublish) setNotice({ type: 'info', text: 'The draft was saved, but publishing did not complete. You can open the saved draft and retry.' });
    } finally {
      busyRef.current = false;
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
  const headerAction = <Link href={agentId ? `/agents/detail?id=${encodeURIComponent(agentId)}` : '/agents'} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><ArrowLeft className="h-4 w-4" /> Cancel</Link>;
  return (
    <div className="mx-auto w-full max-w-[1250px] p-4 md:p-6 lg:p-8">
      <AgentPageTitle eyebrow={agentId ? 'Draft configuration' : 'Workflow builder'} title={agentId ? 'Edit agent' : 'Create agent'} description="Choose an event, configure recipients and actions, and connect optional condition branches." action={headerAction} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-xs" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
        <span className="rounded-full px-2 py-1 font-bold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>SIMULATION ONLY</span>
        <span>Test runs use fictional sample data. Supported Task events use saved task records, but every message action is simulated and nothing is delivered.</span>
      </div>
      {notice && <div className="mb-4"><NoticeBanner type={notice.type}>{notice.text}</NoticeBanner></div>}

      <Panel title="Agent details" description="The agent starts in Draft. Publishing runs strict server-side validation.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Agent name <span className="text-rose-600">*</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={readOnly || busy} placeholder="e.g. Task due reminder" className={inputClass} style={controlStyle} /><span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{name.length}/100</span></label>
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Module <span className="text-rose-600">*</span><select value={module} onChange={(event) => changeModule(event.target.value as AgentModule)} disabled={readOnly || busy || Boolean(savedAgentId || agentId)} className={inputClass} style={controlStyle}>{Object.keys(definitions.modules).map((key) => <option key={key} value={key}>{key}</option>)}</select><span className="mt-1 block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{definitions.modules[module].description}</span></label>
          <label className="block text-sm font-semibold md:col-span-2" style={{ color: 'var(--text-main)' }}>Description <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={2} disabled={readOnly || busy} placeholder="What this agent is intended to do" className={inputClass} style={controlStyle} /><span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{description.length}/500</span></label>
        </div>
      </Panel>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* Sequential Step Progression Breadcrumb */}
          <div className="mb-4 flex items-center justify-between gap-1 overflow-x-auto rounded-xl border p-2 text-xs" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}>
            {STEPS.map((step, idx) => {
              const isActive = activeStep === step.key;
              const isUnlocked = isWorkflowStageUnlocked(step.key, confirmedSteps);
              const isConfirmed = Boolean(confirmedSteps[step.key]) && stepValidity(step.key);
              return (
                <React.Fragment key={step.key}>
                  <button
                    type="button"
                    disabled={readOnly || busy || !isUnlocked}
                    onClick={() => moveToStep(step.key)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary)' : isConfirmed ? 'var(--text-main)' : isUnlocked ? 'var(--text-muted)' : 'var(--text-subtle)',
                    }}
                  >
                    {isConfirmed ? (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="grid h-4 w-4 place-items-center rounded-full border text-[10px]" style={{ borderColor: 'currentColor' }}>
                        {idx + 1}
                      </span>
                    )}
                    <span>{step.title}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Sequential Setup Cards */}
          <div className="space-y-4">
            {STEPS.map((step, index) => {
              const isActive = activeStep === step.key;
              const isUnlocked = isWorkflowStageUnlocked(step.key, confirmedSteps);
              const isConfirmed = Boolean(confirmedSteps[step.key]) && stepValidity(step.key);
              const isLocked = !isUnlocked;

              // 1. LOCKED STAGE CARD
              if (isLocked) {
                return (
                  <div
                    key={step.key}
                    className="flex items-center justify-between gap-3 rounded-xl border p-4 transition-opacity opacity-50"
                    style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-main)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-semibold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-subtle)' }}>
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>
                            {step.icon} {step.title}
                          </span>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                            Locked
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          Complete {index > 0 ? STEPS[index - 1].title : 'previous stage'} and click Done to unlock
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. COMPACT COMPLETED STAGE CARD (when not actively being edited)
              if (isConfirmed && !isActive) {
                return (
                  <div
                    key={step.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-shadow hover:shadow-xs"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-main)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Check className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {step.icon} {step.title}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Completed
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          {getStageSummary(step.key)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={readOnly || busy}
                      onClick={() => moveToStep(step.key)}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                      style={{ borderColor: 'var(--border-main)', color: 'var(--primary)' }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                );
              }

              // 3. ACTIVE STAGE CARD (Expanded Controls + Done Button)
              return (
                <div
                  key={step.key}
                  className="rounded-xl border p-5 shadow-xs"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--primary)' }}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-lg text-white font-bold text-xs" style={{ backgroundColor: 'var(--primary)' }}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                            {step.icon} {step.title}
                          </span>
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                            Active
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{step.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stage-Specific Form Controls */}
                  {step.key === 'event' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Configure event</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose an event emitted by the application, or inspect an unavailable trigger’s prerequisite.</p>
                      </div>
                      <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                        Trigger
                        <select
                          value={typeof config.trigger === 'string' ? config.trigger : ''}
                          disabled={readOnly || busy}
                          onChange={(event) => {
                            const next = definitions.modules[module].triggers.find((item) => item.value === event.target.value);
                            patchConfig({
                              trigger: event.target.value,
                              conditions: next?.condition ? { [next.condition.key]: next.condition.default } : {},
                            });
                          }}
                          className={inputClass}
                          style={controlStyle}
                        >
                          <option value="">Select an event</option>
                          {definitions.modules[module].triggers.map((item) => (
                            <option key={item.value} value={item.value} title={item.supportReason}>
                              {item.value}{item.runtimeAvailable === false ? ' · prerequisite required' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      {trigger && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {trigger.description || (trigger.runtimeAvailable ? `Runs when ${trigger.value.toLowerCase()}.` : trigger.supportReason)}
                        </p>
                      )}
                      {trigger?.runtimeAvailable === false && (
                        <NoticeBanner type="info">
                          Prerequisite required. {trigger.supportReason || 'This trigger does not have a runtime event source.'} Publication is blocked until it can execute reliably.
                        </NoticeBanner>
                      )}
                      {trigger?.condition && (
                        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}>
                          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                            {trigger.condition.label}
                            <input
                              type="number"
                              min={trigger.condition.min}
                              max={trigger.condition.max}
                              step={1}
                              value={conditionValue ?? trigger.condition.default}
                              disabled={readOnly || busy}
                              onChange={(event) => patchConfig({ conditions: { [trigger.condition!.key]: event.target.value === '' ? undefined : Number(event.target.value) } })}
                              className={inputClass}
                              style={controlStyle}
                            />
                          </label>
                          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            Whole number from {trigger.condition.min} to {trigger.condition.max}. Default: {trigger.condition.default}.
                          </p>
                        </div>
                      )}
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Task create/update/comment/subtask/file events are dispatched from their save service. Expiry and date-approaching triggers require a scheduler and cannot be published. Test runs use fixed sample records.
                      </p>
                    </div>
                  )}

                  {step.key === 'recipient' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Select recipients</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose role recipients, or route a Task workflow to the Client linked to its triggering Task.</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {definitions.recipients.map((recipient) => {
                          const selected = selectedRecipients.includes(recipient);
                          const isClient = recipient === 'Client';
                          const unavailable = isClient && module !== 'Task';
                          return (
                            <label
                              key={recipient}
                              className={`flex items-start gap-3 rounded-lg border p-4 ${unavailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                              style={{
                                borderColor: selected ? 'var(--primary)' : 'var(--border-main)',
                                backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-surface)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={readOnly || busy || unavailable}
                                onChange={(event) => updateRecipients(event.target.checked ? [...selectedRecipients, recipient] : selectedRecipients.filter((item) => item !== recipient))}
                                className="mt-0.5 h-4 w-4 accent-blue-700"
                              />
                              <span>
                                <span className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{recipient}</span>
                                <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {isClient ? 'Resolve from the triggering Task’s clientId, within this organization. A valid contact is required at runtime.' : 'Resolved from organization-scoped Task and user records for event runs; test runs use preview-only sample identities.'}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {selectedRecipients.length} recipient type{selectedRecipients.length === 1 ? '' : 's'} selected. A Task event identifies one linked Client; users without valid channel contact details fail that action.
                      </p>
                    </div>
                  )}

                  {step.key === 'channel' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Choose a channel</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose how the configured action would be delivered.</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {definitions.channels.map((channel) => {
                          const selected = selectedChannel === channel;
                          const blurb = channel === 'Email' ? 'Email action · simulated in Agent Center' : channel === 'WhatsApp' ? 'WhatsApp action · provider not connected' : 'In-app action · simulation only';
                          return (
                            <button
                              key={channel}
                              type="button"
                              disabled={readOnly || busy}
                              onClick={() => patchConfig({ channel })}
                              className="rounded-xl border p-4 text-left"
                              style={{
                                borderColor: selected ? 'var(--primary)' : 'var(--border-main)',
                                backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-surface)',
                              }}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>{channel}</span>
                                <span className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-blue-700' : 'border-slate-300'}`}>
                                  {selected && <span className="m-0.5 block h-2 w-2 rounded-full bg-blue-700" />}
                                </span>
                              </span>
                              <span className="mt-2 block text-xs" style={{ color: 'var(--text-muted)' }}>{blurb}</span>
                            </button>
                          );
                        })}
                      </div>
                      <NoticeBanner type="info">
                        Saving or previewing a channel never sends a message. Agent Center execution currently uses a simulated provider; it is not connected to the Gmail session or a WhatsApp Business sender.
                      </NoticeBanner>
                    </div>
                  )}

                  {step.key === 'action' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Configure action</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose the operation, channel and target from the preceding stages. Saved graph actions can override those defaults.</p>
                      </div>
                      <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                        Action
                        <select
                          value={selectedAction}
                          disabled={readOnly || busy}
                          onChange={(event) => patchConfig({ action: event.target.value })}
                          className={inputClass}
                          style={controlStyle}
                        >
                          <option value="">Select an action</option>
                          {definitions.actions.map((action) => (
                            <option key={action} value={action}>{action}</option>
                          ))}
                        </select>
                      </label>
                      {selectedChannel === 'Email' && (
                        <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          Email template
                          <select
                            value={templateId}
                            disabled={readOnly || busy}
                            onChange={(event) => {
                              const id = event.target.value;
                              const template = definitions.emailTemplates.find((item) => item.id === id);
                              patchConfig({
                                templateId: id,
                                ...(template ? { subject: template.subject, message: template.message } : {}),
                              });
                            }}
                            className={inputClass}
                            style={controlStyle}
                          >
                            <option value="custom">Custom email</option>
                            {(module === 'Task' ? definitions.emailTemplates : []).map((template) => (
                              <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                          </select>
                          <span className="mt-1 block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                            {module === 'Task' ? 'Built-in templates are saved with this workflow and can be edited below.' : 'No built-in templates are available for this record type; use a custom message.'}
                          </span>
                        </label>
                      )}
                      {selectedChannel === 'Email' && (
                        <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          Subject
                          <input
                            value={subject}
                            disabled={readOnly || busy}
                            maxLength={200}
                            onChange={(event) => patchConfig({ subject: event.target.value, templateId: templateId === 'custom' ? 'custom' : templateId })}
                            placeholder="Task update for {{client.name}}"
                            className={inputClass}
                            style={controlStyle}
                          />
                          <span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{subject.length}/200</span>
                        </label>
                      )}
                      <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                        {selectedChannel === 'Email' ? 'Email body' : 'Message'} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(maximum 1,000 characters)</span>
                        <textarea
                          value={message}
                          disabled={readOnly || busy}
                          maxLength={1000}
                          rows={6}
                          onChange={(event) => patchConfig({ message: event.target.value })}
                          placeholder="Your task {{task.taskName}} needs your attention."
                          className={inputClass}
                          style={controlStyle}
                        />
                        <span className="mt-1 block text-right text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{message.length}/1000</span>
                      </label>
                      <div className="rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-main)' }}>Allowed template variables:</strong> {definitions.templateVariables.map((variable) => `{{${variable}}}`).join(', ')}. Unknown variables are rejected on publish. Task previews can use a selected authorized Task record; other previews use sample data.
                      </div>
                      <WorkflowGraphEditor
                        value={workflowGraph}
                        disabled={readOnly || busy}
                        module={module}
                        definitions={definitions}
                        onChange={(graph) => patchConfig({ workflowGraph: graph })}
                      />
                    </div>
                  )}

                  {/* Inline Error Notice */}
                  {localError && (
                    <div role="alert" className="mt-4">
                      <NoticeBanner type="error">{localError}</NoticeBanner>
                    </div>
                  )}

                  {/* Card Action Row with Previous, Preview & Done */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-main)' }}>
                    <div>
                      {index > 0 && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.preventDefault();
                            moveToStep(STEP_SEQUENCE[index - 1]);
                          }}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                          style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                          Previous
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={readOnly || busy}
                        onClick={(e) => {
                          e.preventDefault();
                          setPreviewOpen((open) => !open);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                      >
                        <Eye className="h-4 w-4" /> {previewOpen ? 'Hide preview' : 'Preview message'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || readOnly}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void confirmStep(step.key);
                        }}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        {busy ? 'Saving…' : 'Done'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {previewOpen && <div className="mt-4"><Panel title="Message preview" description="Preview only. This does not contact a client, call a provider, or create an execution record.">{module === 'Task' && <div className="mb-4"><label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Preview using an authorized Task<select value={selectedPreviewTaskId} onChange={(event) => setSelectedPreviewTaskId(event.target.value)} className={inputClass} style={controlStyle}><option value="">Use sample preview data</option>{(previewTasksQuery.data || []).map((task) => <option key={task.id} value={task.id}>{task.taskName} · {task.clientName || 'No client'}</option>)}</select></label>{previewTasksQuery.isLoading ? <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Loading Tasks visible to your account…</p> : previewTasksQuery.isError ? <p role="alert" className="mt-2 text-xs text-rose-700">Could not load authorized Task records. Sample preview remains available, but no real record data is being used.</p> : selectedPreviewTask ? <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Using authorized Task record “{selectedPreviewTask.taskName}”. Preview only; linked client contact details are not included in this preview.</p> : <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Sample values are fictional and preview-only.</p>}</div>}{selectedRecipients.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select at least one recipient to view a preview.</p> : <div className="grid gap-3 md:grid-cols-2">{selectedRecipients.map((recipient) => { const renderedSubject = previewText(subject, module, recipient, selectedPreviewTask); const renderedBody = previewText(message, module, recipient, selectedPreviewTask); const hasMissingValues = renderedSubject.includes('{{') || renderedBody.includes('{{'); const badVariable = unsupportedVariables(`${subject}\n${message}`, definitions.templateVariables)[0]; return <div key={recipient} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)' }}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{recipient}</p><span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>{selectedChannel || 'No channel'} · Preview only</span></div>{selectedChannel === 'Email' && <><p className="mt-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Subject</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{renderedSubject || '(No subject)'}</p></>}<p className="mt-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{selectedChannel === 'Email' ? 'Email body' : 'Message'}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--text-main)' }}>{renderedBody}</p>{badVariable ? <p className="mt-3 text-xs font-semibold text-rose-700">Unsupported template variable: {`{{${badVariable}}}`}.</p> : hasMissingValues && <p className="mt-3 text-xs font-semibold text-amber-700">Some allowed variables are unavailable in this preview and remain unresolved.</p>}<p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Action: {selectedAction || 'Not selected'}</p></div>; })}</div>}</Panel></div>}
        </div>

        <aside className="space-y-4">
          <Panel title="Workflow summary" description="Current configuration at a glance."><div className="space-y-3">{summarizeConfig(config).map(([label, value]) => <div key={label} className="border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: 'var(--border-main)' }}><p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p><p className="mt-1 break-words text-sm font-medium" style={{ color: 'var(--text-main)' }}>{value}</p></div>)}</div><div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}><span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${complete ? 'bg-emerald-500' : 'bg-amber-500'}`} />{complete ? 'All required fields look complete.' : 'Some required fields are still missing.'}</div></Panel>
          <Panel title="Save and publish" description="Drafts may be incomplete. Publishing requires a complete configuration."><div className="space-y-2"><button type="button" disabled={busy || readOnly} onClick={() => void submit(false)} className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save as draft'}</button><button type="button" disabled={busy || readOnly || !complete} onClick={() => void submit(true)} className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}><Send className="h-4 w-4" /> {busy ? 'Working…' : 'Publish agent'}</button></div><p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Publishing changes the status to Published. Testing remains simulated; no scheduler is attached.</p></Panel>
        </aside>
      </div>
    </div>
  );
}
