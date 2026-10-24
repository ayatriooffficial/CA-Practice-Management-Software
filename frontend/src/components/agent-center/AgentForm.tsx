'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  Check,
  ChevronRight,
  Eye,
  Lock,
  Mail,
  Maximize2,
  MessageCircle,
  Minus,
  Plus,
  Send,
  Sliders,
  Sparkles,
  Users,
  X,
  Search,
  Bell,
  SlidersHorizontal,
} from 'lucide-react';
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
  WorkflowGraph,
} from '@/types/agentCenter';
import { NoticeBanner } from './shared';
import WorkflowGraphEditor from './WorkflowGraphEditor';
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

const STEPS: Array<{
  key: StepKey;
  stepNumber: number;
  label: string;
  defaultTitle: string;
  defaultSubtitle: string;
  colorName: 'orange' | 'purple' | 'green' | 'cyan';
  icon: React.ReactNode;
}> = [
  {
    key: 'event',
    stepNumber: 1,
    label: 'EVENT',
    defaultTitle: 'Select Event',
    defaultSubtitle: 'Click to choose a trigger event',
    colorName: 'orange',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    key: 'recipient',
    stepNumber: 2,
    label: 'RECIPIENT',
    defaultTitle: 'Select Recipients',
    defaultSubtitle: 'Click to set who gets notified',
    colorName: 'purple',
    icon: <Users className="h-3.5 w-3.5" />,
  },
  {
    key: 'channel',
    stepNumber: 3,
    label: 'CHANNEL',
    defaultTitle: 'Select Channel',
    defaultSubtitle: 'Click to choose delivery channel',
    colorName: 'green',
    icon: <Send className="h-3.5 w-3.5" />,
  },
  {
    key: 'action',
    stepNumber: 4,
    label: 'ACTION',
    defaultTitle: 'Configure Action',
    defaultSubtitle: 'Click to write the message',
    colorName: 'cyan',
    icon: <Sliders className="h-3.5 w-3.5" />,
  },
];

const STEP_SEQUENCE: StepKey[] = STEPS.map((step) => step.key);

function formatRecipientLabel(recipient: string): string {
  if (recipient === 'Assigned user') return 'Assignee';
  if (recipient === 'Task owner') return 'Manager';
  return recipient;
}

function formatRecipientsDisplay(recipients: string[]): string {
  if (!recipients.length) return 'Select Recipients';
  return recipients.map(formatRecipientLabel).join(', ');
}

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

function previewText(message: string, module: AgentModule, recipient: AgentRecipient, selectedTask?: TaskItem) {
  const roleName = recipient === 'Assigned user' ? 'Milton' : recipient === 'Task owner' ? 'Manager' : 'Client';
  const task = selectedTask || {
    id: 'TASK-1001',
    taskId: 'TASK-1001',
    taskName: 'Update Homepage',
    clientName: 'Ayatrio Practice',
    priority: 'High' as const,
    status: 'In Progress' as const,
    targetDueDate: '2026-02-15',
    assigneeName: 'Milton',
    reviewerName: 'Sample Reviewer',
    creatorName: 'Likith S',
  };
  const sampleEvent: Record<string, unknown> = module === 'Task'
    ? {
        task: {
          id: task.taskId || task.id,
          taskName: task.taskName,
          clientName: task.clientName,
          priority: task.priority,
          status: task.status,
          targetDueDate: task.targetDueDate,
          assigneeName: task.assigneeName,
          reviewerName: task.reviewerName,
          creatorName: task.creatorName,
        },
      }
    : module === 'DSC'
      ? { dsc: { id: 'DSC-2001', holder: 'Sample User', expiryDate: '2026-02-01' } }
      : { license: { id: 'LIC-3001', name: 'Sample Trade License', expiryDate: '2026-02-01' } };

  const recipientData: Record<AgentRecipient, { name: string; address: string }> = {
    Client: { name: 'Ayatrio Practice', address: 'client@example.test' },
    'Assigned user': { name: roleName, address: 'milton@example.test' },
    'Task owner': { name: 'Manager', address: 'manager@example.test' },
    'Account administrator': { name: 'Account Administrator', address: 'admin@example.test' },
    'Responsible person': { name: 'Responsible Person', address: 'responsible@example.test' },
  };

  const client = module === 'Task' ? { name: task.clientName, email: selectedTask ? undefined : 'client@example.test' } : undefined;
  const variables = {
    ...sampleEvent,
    event: sampleEvent[module.toLowerCase()] || {},
    recipient: recipientData[recipient],
    client,
    agent: { name: 'Task Agent' },
    your_firm_name: 'Ayatrio Practice',
    expense_name: 'Design Assets',
    expense_amount: '₹ 15,000',
    reviewer_name: 'Sample Reviewer',
    task_status: task.status,
  };

  return message.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, path: string) => {
    const value = path.split('.').reduce<unknown>(
      (source, key) => (source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined),
      variables
    );
    return value === undefined || value === null ? match : String(value);
  });
}

function unsupportedVariables(text: string, allowed: string[]) {
  return [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)]
    .map((match) => match[1])
    .filter((variable) => !allowed.includes(variable));
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

// SVG Curved Branch Connectors from Action card to Recipient Result Cards
function RecipientConnectors({
  count,
  cardWidth = 350,
  gap = 24,
  originXOverride,
}: {
  count: number;
  cardWidth?: number;
  gap?: number;
  originXOverride?: number;
}) {
  if (count <= 0) return null;
  const totalWidth = count * cardWidth + (count - 1) * gap;
  const svgHeight = 64;
  const originX = originXOverride !== undefined ? originXOverride : totalWidth / 2;
  const forkY = 24;

  return (
    <svg
      className="overflow-visible pointer-events-none mb-2"
      width={totalWidth}
      height={svgHeight}
      viewBox={`0 0 ${totalWidth} ${svgHeight}`}
      fill="none"
    >
      {/* Vertical line dropping down from center of Action card */}
      <line
        x1={originX}
        y1={0}
        x2={originX}
        y2={forkY}
        stroke="#94A3B8"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      {/* Central junction dot */}
      <circle cx={originX} cy={forkY} r="3" fill="#94A3B8" />

      {/* Curved branching lines to each card top center */}
      {Array.from({ length: count }).map((_, i) => {
        const targetX = i * (cardWidth + gap) + cardWidth / 2;
        const pathData =
          count === 1
            ? `M ${originX} ${forkY} L ${originX} ${svgHeight}`
            : `M ${originX} ${forkY} C ${originX} ${forkY + 24}, ${targetX} ${svgHeight - 24}, ${targetX} ${svgHeight}`;
        return (
          <g key={i}>
            <path
              d={pathData}
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
            />
            <circle cx={targetX} cy={svgHeight} r="3.5" fill="#94A3B8" />
          </g>
        );
      })}
    </svg>
  );
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
  const [activePanelOpen, setActivePanelOpen] = useState(false);
  const [confirmedSteps, setConfirmedSteps] = useState<Partial<Record<StepKey, boolean>>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreviewTaskId, setSelectedPreviewTaskId] = useState('');
  const [actionTab, setActionTab] = useState<'write' | 'preview'>('write');
  const [showAdvancedGraph, setShowAdvancedGraph] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState('');
  const [zoom, setZoom] = useState(1.0);
  const [localError, setLocalError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const definitions = PUBLIC_DEFINITIONS;

  const integrationsQuery = useQuery({
    queryKey: ['agent-center-integrations'],
    queryFn: async () => {
      try {
        const response = await request<{ email: { configured: boolean; provider: string }; whatsApp: { configured: boolean; provider: string } }>('/agent-center/integrations/status');
        if (response.success && response.data) return response.data;
      } catch {}
      return {
        email: { configured: false, provider: 'SMTP' },
        whatsApp: { configured: false, provider: 'Meta Cloud API' },
      };
    },
    staleTime: 60_000,
    retry: false,
  });

  const emailConfigured = Boolean(integrationsQuery.data?.email?.configured);
  const whatsAppConfigured = Boolean(integrationsQuery.data?.whatsApp?.configured);

  const previewTasksQuery = useQuery({
    queryKey: ['agent-center-preview-tasks'],
    queryFn: async () => {
      const response = await request<TaskItem[]>('/tasks?limit=100&sortBy=updatedAt&sortOrder=desc');
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || 'Unable to load authorized Tasks for preview.');
      }
      return response.data;
    },
    enabled: previewOpen && module === 'Task',
    staleTime: 60_000,
    retry: false,
  });

  const selectedPreviewTask = previewTasksQuery.data?.find(
    (task) => task.id === selectedPreviewTaskId || task.taskId === selectedPreviewTaskId
  );

  // Hydrate from existing agent record
  useEffect(() => {
    if (!agentId || !agentQuery.data || loadedAgentId === agentQuery.data.id) return;
    const agent = agentQuery.data;
    setName(agent.name);
    setDescription(agent.description || '');
    setModule(agent.module);
    const stored = (agent.config || {}) as AgentConfigDraft;
    setConfig({
      ...stored,
      recipient: recipientArray(stored.recipient),
      subject: stored.subject || (typeof stored.action === 'string' ? stored.action : ''),
      templateId: stored.templateId || 'custom',
      workflowGraph: stored.workflowGraph || { nodes: [], edges: [] },
    });
    setSavedAgentId(agent.id);

    const storedTrigger = triggerFor(stored, agent.module, definitions);
    const storedConditionValue = getCondition(stored, storedTrigger) ?? storedTrigger?.condition?.default;
    const storedRecipients = recipientArray(stored.recipient);
    const storedChannel = typeof stored.channel === 'string' ? stored.channel : '';
    const storedAction = typeof stored.action === 'string' ? stored.action : '';
    const storedSubject = typeof stored.subject === 'string' ? stored.subject : storedAction;
    const storedMessage = typeof stored.message === 'string' ? stored.message : '';
    const storedGraph = (stored.workflowGraph && typeof stored.workflowGraph === 'object'
      ? stored.workflowGraph
      : { nodes: [], edges: [] }) as WorkflowGraph;

    setConfirmedSteps(
      restoreWorkflowStageProgress(
        {
          event: Boolean(
            storedTrigger &&
              storedTrigger.runtimeAvailable !== false &&
              (!storedTrigger.condition ||
                (Number.isInteger(storedConditionValue) &&
                  (storedConditionValue ?? 0) >= storedTrigger.condition.min &&
                  (storedConditionValue ?? 0) <= storedTrigger.condition.max))
          ),
          recipient:
            storedRecipients.length > 0 && storedRecipients.every((r) => definitions.recipients.includes(r)),
          channel: definitions.channels.includes(storedChannel as AgentChannel),
          action: Boolean(
            storedAction &&
              definitions.actions.includes(storedAction as AgentAction) &&
              storedMessage.trim() &&
              storedMessage.trim().length <= 1000 &&
              storedSubject.length <= 200 &&
              (storedChannel !== 'Email' || storedSubject.trim()) &&
              unsupportedVariables(`${storedSubject}\n${storedMessage}`, definitions.templateVariables).length === 0 &&
              graphIsValid(storedGraph, agent.module, definitions)
          ),
        },
        stored.workflowStageProgress
      )
    );
    setLoadedAgentId(agent.id);
  }, [agentId, agentQuery.data, loadedAgentId, definitions]);

  // Initialize new agent form defaults: honest, unconfigured initial state
  useEffect(() => {
    if (!definitions || agentId) return;
    setConfig((current) => {
      if (current && Object.keys(current).length > 0) return current;
      return {
        trigger: undefined,
        conditions: {},
        recipient: [],
        channel: undefined,
        action: undefined,
        subject: '',
        templateId: 'custom',
        message: '',
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
  const subject = typeof config.subject === 'string' ? config.subject : '';
  const templateId = typeof config.templateId === 'string' ? config.templateId : 'custom';
  const workflowGraph = (config.workflowGraph && typeof config.workflowGraph === 'object'
    ? config.workflowGraph
    : { nodes: [], edges: [] }) as WorkflowGraph;

  const eventStepValid = Boolean(
    trigger &&
      trigger.runtimeAvailable !== false &&
      (!trigger.condition ||
        (Number.isInteger(conditionValue) &&
          (conditionValue ?? 0) >= trigger.condition.min &&
          (conditionValue ?? 0) <= trigger.condition.max))
  );
  const recipientStepValid =
    selectedRecipients.length > 0 && selectedRecipients.every((r) => definitions?.recipients.includes(r));
  const channelStepValid = Boolean(selectedChannel && definitions?.channels.includes(selectedChannel as AgentChannel));
  const actionStepValid = Boolean(
    selectedAction &&
      definitions?.actions.includes(selectedAction as AgentAction) &&
      message.trim() &&
      message.trim().length <= 1000 &&
      subject.length <= 200 &&
      (selectedChannel !== 'Email' || subject.trim()) &&
      unsupportedVariables(`${subject}\n${message}`, definitions.templateVariables).length === 0
  );

  const hasValidPreviewConfig = Boolean(
    trigger &&
      eventStepValid &&
      selectedRecipients.length > 0 &&
      recipientStepValid &&
      selectedChannel &&
      channelStepValid &&
      selectedAction &&
      actionStepValid &&
      message.trim()
  );

  const complete = Boolean(
    definitions &&
      name.length <= 100 &&
      description.length <= 500 &&
      hasValidPreviewConfig &&
      graphIsValid(workflowGraph, module, definitions) &&
      STEP_SEQUENCE.every((step) => confirmedSteps[step] === true)
  );

  const isWorkflowCompleted = Boolean(
    STEP_SEQUENCE.every((step) => confirmedSteps[step] === true) && hasValidPreviewConfig
  );

  const showRecipientResultCards = Boolean(
    (previewOpen && hasValidPreviewConfig) || isWorkflowCompleted
  );

  const lifecycleStatus: AgentStatus | undefined = agentQuery.data?.status;
  const readOnly = Boolean(agentId && lifecycleStatus && lifecycleStatus !== 'draft');

  function patchConfig(patch: Record<string, unknown>) {
    setConfig((current) => ({ ...current, ...patch }) as AgentConfigDraft);
    const relevantStepKeys = Object.keys(patch).reduce<StepKey[]>((steps, key) => {
      if (key === 'trigger' || key === 'conditions') return [...steps, 'event'];
      if (key === 'recipient') return [...steps, 'recipient'];
      if (key === 'channel') return [...steps, 'channel'];
      if (
        key === 'action' ||
        key === 'message' ||
        key === 'subject' ||
        key === 'templateId' ||
        key === 'workflowGraph'
      )
        return [...steps, 'action'];
      return steps;
    }, []);
    if (relevantStepKeys.length > 0) {
      const firstAffectedIndex = Math.min(...relevantStepKeys.map((key) => STEP_SEQUENCE.indexOf(key)));
      setConfirmedSteps((current) => invalidateWorkflowStagesFrom(current, STEP_SEQUENCE[firstAffectedIndex]));
    }
    setLocalError('');
    setNotice(null);
  }

  function validateStep(stepKey: StepKey): string | undefined {
    switch (stepKey) {
      case 'event':
        if (!trigger) return 'Select a valid event trigger before continuing.';
        if (trigger.runtimeAvailable === false) {
          return trigger.supportReason || 'This trigger does not have a runtime event source yet.';
        }
        if (trigger.condition && !eventStepValid) {
          return `Enter an integer between ${trigger.condition.min} and ${trigger.condition.max} for ${trigger.condition.label}.`;
        }
        return undefined;
      case 'recipient':
        if (!recipientStepValid) return 'Select at least one valid recipient before continuing.';
        return undefined;
      case 'channel':
        if (!channelStepValid) return 'Select a valid channel before continuing.';
        return undefined;
      case 'action':
        if (!selectedAction || !definitions?.actions.includes(selectedAction as AgentAction)) {
          return 'Select a valid action before continuing.';
        }
        if (!message.trim()) return 'Add a message before continuing.';
        if (message.trim().length > 1000) return 'The message must be 1,000 characters or fewer.';
        if (subject.length > 200) return 'Email subject must be 200 characters or fewer.';
        if (selectedChannel === 'Email' && !subject.trim()) return 'Add an email subject before continuing.';
        const unsupported = unsupportedVariables(`${subject}\n${message}`, definitions?.templateVariables || [])[0];
        if (unsupported) return `Template variable {{${unsupported}}} is not supported.`;
        if (!graphIsValid(workflowGraph, module, definitions)) {
          return 'Fix the connected graph: check all condition branches, connections, and action fields.';
        }
        return undefined;
      default:
        return 'Unknown workflow stage.';
    }
  }

  async function persistDraft(progressToSave: WorkflowStageProgress = confirmedSteps, nameOverride?: string) {
    const currentId = savedAgentId || agentId;
    const effectiveName = nameOverride !== undefined ? nameOverride : name.trim() || `${module} Agents Draft`;
    if (!name.trim() && nameOverride) {
      setName(nameOverride);
    }
    const configToSave = { ...config, workflowStageProgress: progressToSave };
    if (currentId) {
      const saved = await updateMutation.mutateAsync({
        id: currentId,
        payload: {
          name: effectiveName,
          module,
          description: description.trim(),
          config: configToSave,
          saveDraft: true,
        },
      });
      setSavedAgentId(saved.id);
      return saved.id;
    }
    const saved = await createMutation.mutateAsync({
      name: effectiveName,
      module,
      description: description.trim(),
      config: configToSave,
      saveDraft: true,
    });
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

    const effectiveName = name.trim() || `${module} Agents Draft`;
    if (!name.trim()) setName(effectiveName);
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
          try {
            await persistDraft({ ...confirmedSteps, [stepKey]: true }, effectiveName);
          } catch (draftErr) {
            console.warn('Backend draft persistence unavailable; keeping local state:', draftErr);
          }
        }
      );

      if (!result.ok) {
        setLocalError(result.message);
        return;
      }

      setConfirmedSteps(result.progress);
      setLocalError('');

      if (result.nextStage) {
        setActiveStep(result.nextStage);
        setActivePanelOpen(true);
      } else {
        // Final Action step completed
        setActivePanelOpen(false);
        setNotice({
          type: 'success',
          text: 'All four stages are saved as a draft. Notification preview cards are generated below the Action card.',
        });
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'An error occurred while saving this stage.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleCardClick(stepKey: StepKey) {
    if (busy) return;
    if (!isWorkflowStageUnlocked(stepKey, confirmedSteps)) {
      const stageIndex = STEP_SEQUENCE.indexOf(stepKey);
      const prevStage = STEP_SEQUENCE[stageIndex - 1];
      setLocalError(`Complete the ${prevStage.toUpperCase()} stage before configuring ${stepKey.toUpperCase()}.`);
      return;
    }
    setActiveStep(stepKey);
    setActivePanelOpen(true);
    setLocalError('');
  }

  function toggleRecipient(recipient: AgentRecipient) {
    setConfig((current) => {
      const list = recipientArray(current.recipient);
      const next = list.includes(recipient)
        ? list.filter((r) => r !== recipient)
        : [...list, recipient];
      const patch = {
        recipient: next,
        recipientResolution: next.includes('Client')
          ? ({ mode: 'task-linked-client', relationship: 'trigger-record' } as const)
          : undefined,
      };
      return { ...current, ...patch };
    });
    setConfirmedSteps((current) => invalidateWorkflowStagesFrom(current, 'recipient'));
    setLocalError('');
    setNotice(null);
  }

  function updateRecipients(nextRecipients: AgentRecipient[]) {
    const selected = [...new Set(nextRecipients)];
    patchConfig({
      recipient: selected,
      recipientResolution: selected.includes('Client')
        ? { mode: 'task-linked-client', relationship: 'trigger-record' }
        : undefined,
    });
  }

  async function handleSaveDraft() {
    try {
      setBusy(true);
      await persistDraft();
      setNotice({ type: 'success', text: 'Workflow draft saved successfully.' });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save draft.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(shouldPublish: boolean) {
    if (busyRef.current) return;
    setLocalError('');
    setNotice(null);
    const effectiveName = name.trim() || `${module} Agents`;
    if (effectiveName.length > 100) {
      setLocalError('Agent name must be 100 characters or fewer.');
      return;
    }
    if (shouldPublish && !complete) {
      setLocalError('Complete all four stages before publishing. Check the event condition, recipients, channel, and action.');
      setActiveStep(!trigger || !eventStepValid ? 'event' : !recipientStepValid ? 'recipient' : !channelStepValid ? 'channel' : 'action');
      setActivePanelOpen(true);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    let savedId = savedAgentId || agentId;
    try {
      const progressToPersist: WorkflowStageProgress = shouldPublish
        ? { event: true, recipient: true, channel: true, action: true }
        : confirmedSteps;
      savedId = await persistDraft(progressToPersist, effectiveName);
      if (shouldPublish && savedId) {
        await publishMutation.mutateAsync(savedId);
      }
      if (savedId) router.push(`/agents/detail?id=${encodeURIComponent(savedId)}`);
      else router.push('/agents');
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : 'Could not save the agent.';
      setLocalError(messageText);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // Filter triggers in Event modal
  const filteredTriggers = (definitions.modules[module]?.triggers || []).filter((item) =>
    item.value.toLowerCase().includes(triggerSearch.toLowerCase())
  );

  const isStepConfirmed = (stepKey: StepKey) => Boolean(confirmedSteps[stepKey]);

  function renderPanelContent(stepKey: StepKey) {
    const isStepEventValid = stepKey === 'event' && eventStepValid;
    const isStepRecipientValid = stepKey === 'recipient' && recipientStepValid;
    const isStepChannelValid = stepKey === 'channel' && channelStepValid;
    const isStepActionValid = stepKey === 'action' && actionStepValid;
    const isCurrentStepValid = isStepEventValid || isStepRecipientValid || isStepChannelValid || isStepActionValid;

    return (
      <div className="w-full">
        {/* Panel Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 bg-white">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-3 w-3 rounded-full ${
                stepKey === 'event'
                  ? 'bg-orange-500'
                  : stepKey === 'recipient'
                    ? 'bg-purple-500'
                    : stepKey === 'channel'
                      ? 'bg-emerald-500'
                      : 'bg-cyan-500'
              }`}
            />
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {stepKey === 'event' && 'Configure Trigger'}
                {stepKey === 'recipient' && 'Select Recipients'}
                {stepKey === 'channel' && 'Choose Channel'}
                {stepKey === 'action' && 'Configure Action'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Module: {module}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivePanelOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="p-5 max-h-[460px] overflow-y-auto space-y-4 bg-white">
          {/* 1. EVENT CONFIGURATION */}
          {stepKey === 'event' && (
            <div className="space-y-3.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Trigger Event
              </label>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={triggerSearch}
                  onChange={(e) => setTriggerSearch(e.target.value)}
                  placeholder="Search triggers..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Trigger List */}
              <div className="space-y-2 mt-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredTriggers.map((item) => {
                  const isSelected = config.trigger === item.value;
                  return (
                    <div
                      key={item.value}
                      onClick={() => {
                        patchConfig({
                          trigger: item.value,
                          conditions: item.condition ? { [item.condition.key]: item.condition.default } : {},
                        });
                      }}
                      className={`flex items-start justify-between gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 grid h-4 w-4 place-items-center rounded-full border-2 ${
                            isSelected ? 'border-orange-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="h-2 w-2 rounded-full bg-orange-500" />}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.description || (item.runtimeAvailable ? 'This automation is already running.' : item.supportReason)}
                          </p>
                        </div>
                      </div>
                      {item.runtimeAvailable !== false && (
                        <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Condition parameter (e.g. days before due) */}
              {trigger?.condition && (
                <div className="mt-3 p-3.5 rounded-xl border border-orange-100 bg-orange-50/30">
                  <label className="block text-xs font-semibold text-slate-700">
                    {trigger.condition.label}
                    <input
                      type="number"
                      min={trigger.condition.min}
                      max={trigger.condition.max}
                      value={conditionValue ?? trigger.condition.default}
                      disabled={readOnly || busy}
                      onChange={(e) =>
                        patchConfig({
                          conditions: {
                            [trigger.condition!.key]: e.target.value === '' ? undefined : Number(e.target.value),
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                    />
                  </label>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Whole number between {trigger.condition.min} and {trigger.condition.max} days.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. RECIPIENT CONFIGURATION */}
          {stepKey === 'recipient' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Recipients
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose who should be notified when this event triggers.
                </p>
              </div>

              <div className="space-y-2 mt-2">
                {definitions.recipients.map((recipient) => {
                  const selected = selectedRecipients.includes(recipient);
                  const isClient = recipient === 'Client';
                  const unavailable = isClient && module !== 'Task';
                  const displayLabel = formatRecipientLabel(recipient);

                  return (
                    <div
                      key={recipient}
                      onClick={() => {
                        if (!unavailable && !readOnly && !busy) {
                          toggleRecipient(recipient);
                        }
                      }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                        unavailable ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        selected
                          ? 'border-purple-500 bg-purple-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={unavailable || readOnly || busy}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 accent-purple-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{displayLabel}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isClient
                            ? 'Resolves from the triggering Task’s linked client in this practice.'
                            : recipient === 'Assigned user'
                              ? 'Assigned team member or staff on this task.'
                              : recipient === 'Task owner'
                                ? 'Task creator, supervisor, or manager.'
                                : 'Role-based recipient in your organization.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. CHANNEL CONFIGURATION */}
          {stepKey === 'channel' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Choose Delivery Channel
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select how notifications are delivered to recipients.
                </p>
              </div>

              <div className="grid gap-2.5 mt-2">
                {definitions.channels.map((channel) => {
                  const selected = selectedChannel === channel;
                  const icon =
                    channel === 'Email' ? (
                      <Mail className="h-4 w-4 text-emerald-600" />
                    ) : channel === 'WhatsApp' ? (
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Bell className="h-4 w-4 text-emerald-600" />
                    );

                  return (
                    <div
                      key={channel}
                      onClick={() => patchConfig({ channel })}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">{icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{channel}</p>
                          <p className="text-xs text-slate-500">
                            {channel === 'Email'
                              ? 'Standard practice email delivery'
                              : channel === 'WhatsApp'
                                ? 'WhatsApp Business messaging (simulated)'
                                : 'In-app notification badge'}
                          </p>
                          <div className="mt-1">
                            {channel === 'Email' ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  emailConfigured
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {emailConfigured ? 'Connected' : 'Kindly integrate email'}
                              </span>
                            ) : channel === 'WhatsApp' ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  whatsAppConfigured
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {whatsAppConfigured ? 'Connected' : 'Kindly integrate WhatsApp'}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Ready
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`h-4 w-4 rounded-full border-2 grid place-items-center ${
                          selected ? 'border-emerald-600' : 'border-slate-300'
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ACTION CONFIGURATION */}
          {stepKey === 'action' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Configure Action & Message
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize email subject, message body, and dynamic template variables.
                </p>
              </div>

              {/* Action Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Action Type</label>
                <select
                  value={selectedAction}
                  onChange={(e) => patchConfig({ action: e.target.value })}
                  disabled={readOnly || busy}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="">Select an action</option>
                  {definitions.actions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Template Selector */}
              {selectedChannel === 'Email' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email Template</label>
                  <select
                    value={templateId}
                    disabled={readOnly || busy}
                    onChange={(e) => {
                      const id = e.target.value;
                      const template = definitions.emailTemplates.find((item) => item.id === id);
                      patchConfig({
                        templateId: id,
                        ...(template ? { subject: template.subject, message: template.message } : {}),
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500"
                  >
                    <option value="custom">Custom Email Template</option>
                    {(module === 'Task' ? definitions.emailTemplates : []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject line */}
              {selectedChannel === 'Email' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">Subject</label>
                    <span className="text-[10px] text-slate-400">{subject.length}/200</span>
                  </div>
                  <input
                    value={subject}
                    maxLength={200}
                    disabled={readOnly || busy}
                    onChange={(e) => patchConfig({ subject: e.target.value })}
                    placeholder="e.g. Reminder: {{task.taskName}} is due"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Message Body Tabs: Write & Preview */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 mb-2">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setActionTab('write')}
                      className={`pb-1.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                        actionTab === 'write'
                          ? 'border-cyan-500 text-cyan-700'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionTab('preview')}
                      className={`pb-1.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                        actionTab === 'preview'
                          ? 'border-cyan-500 text-cyan-700'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">{message.length}/1000</span>
                </div>

                {actionTab === 'write' ? (
                  <div>
                    <textarea
                      value={message}
                      rows={6}
                      maxLength={1000}
                      disabled={readOnly || busy}
                      onChange={(e) => patchConfig({ message: e.target.value })}
                      placeholder="Dear {{recipient.name}},&#10;&#10;Task {{task.taskName}} is approaching its due date..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs md:text-sm text-slate-800 outline-none focus:border-cyan-500 font-sans"
                    />
                    {/* Template variable pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 mr-1">Insert:</span>
                      {[
                        'task.taskName',
                        'task.targetDueDate',
                        'task.priority',
                        'task.status',
                        'client.name',
                        'recipient.name',
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => patchConfig({ message: `${message} {{${tag}}}` })}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-mono transition-colors"
                        >
                          {`{{${tag}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 max-h-[180px] overflow-y-auto">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {previewText(subject, module, selectedRecipients[0] || 'Assigned user')}
                    </p>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {previewText(message, module, selectedRecipients[0] || 'Assigned user')}
                    </p>
                  </div>
                )}
              </div>

              {/* Advanced Graph Editor Accordion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedGraph((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {showAdvancedGraph ? 'Hide Advanced Workflow Graph' : 'Show Advanced Workflow Graph (Optional)'}
                </button>
                {showAdvancedGraph && (
                  <div className="mt-3">
                    <WorkflowGraphEditor
                      value={workflowGraph}
                      disabled={readOnly || busy}
                      module={module}
                      definitions={definitions}
                      onChange={(graph) => patchConfig({ workflowGraph: graph })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inline Validation Error */}
          {localError && (
            <div className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
              {localError}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActivePanelOpen(false)}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs md:text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={busy || readOnly || !isCurrentStepValid}
            onClick={() => void confirmStep(stepKey)}
            className="px-5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs md:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? (
              'Saving…'
            ) : (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                {stepKey === 'event'
                  ? 'Select Recipients >'
                  : stepKey === 'recipient'
                    ? 'Select Channel >'
                    : stepKey === 'channel'
                      ? 'Configure Action >'
                      : 'Done'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-slate-50 font-sans">
      {/* 1. TOP HEADER & BREADCRUMB (Matches Turia Reference) */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href="/agents" className="hover:text-purple-600 transition-colors">
              Agent Center
            </Link>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-500">{module}</span>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-700 font-semibold">{agentId ? 'Edit Agents' : 'Create Agents'}</span>
          </div>

          {/* Title matching Turia screenshot */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{module} Agents</h1>
          </div>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={busy || readOnly}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs md:text-sm font-medium shadow-xs transition-colors disabled:opacity-50"
          >
            <Bookmark className="h-4 w-4 text-slate-500" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => {
              if (!hasValidPreviewConfig && !previewOpen) {
                setNotice({
                  type: 'info',
                  text: 'Configure a trigger, recipients, channel, and message to preview notification cards.',
                });
                return;
              }
              setPreviewOpen((open) => !open);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs md:text-sm font-medium transition-colors"
          >
            <Eye className="h-4 w-4 text-purple-600" />
            {previewOpen ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={() => void submit(true)}
            disabled={busy || readOnly || !complete}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs md:text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Publish
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className="px-6 pt-3">
          <NoticeBanner type={notice.type}>{notice.text}</NoticeBanner>
        </div>
      )}

      {/* 2. TURIA WORKFLOW CANVAS (Subtle Dotted Grid) */}
      <main
        className="relative flex-1 w-full overflow-x-auto overflow-y-auto min-h-[920px] p-6 md:p-10 select-none"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Zoom Transform Wrapper */}
        <div
          className="min-w-[1150px] mx-auto transition-transform duration-150 origin-top flex flex-col items-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* A. FOUR HORIZONTALLY CONNECTED WORKFLOW CARDS */}
          <div className="relative pt-6 pb-4 w-full flex justify-center">
            {/* Cards and In-Between Dotted Connector Lines Row (Centered Midpoint Alignment) */}
            <div className="relative z-10 flex items-center justify-center">
              {/* Outer Left Lead-In Dotted Line */}
              <div className="w-8 md:w-12 h-0 border-t-2 border-dashed border-[#CBD5E1] shrink-0" />

              {STEPS.map((step, index) => {
                const isActive = activeStep === step.key && activePanelOpen;
                const isConfirmed = isStepConfirmed(step.key);
                const isUnlocked = isWorkflowStageUnlocked(step.key, confirmedSteps);

                // Card border colors
                const borderColor =
                  step.key === 'event'
                    ? isConfirmed || isActive
                      ? 'border-[#F97316]'
                      : 'border-orange-300'
                    : step.key === 'recipient'
                      ? isConfirmed || isActive
                        ? 'border-[#8B5CF6]'
                        : 'border-purple-300'
                      : step.key === 'channel'
                        ? isConfirmed || isActive
                          ? 'border-[#10B981]'
                          : 'border-emerald-300'
                        : isConfirmed || isActive
                          ? 'border-[#06B6D4]'
                          : 'border-cyan-300';

                // Badge styling
                const badgeStyle =
                  step.key === 'event'
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : step.key === 'recipient'
                      ? 'bg-purple-50 text-purple-600 border-purple-200'
                      : step.key === 'channel'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-cyan-50 text-cyan-600 border-cyan-200';

                // Display titles & subtitles
                let title = step.defaultTitle;
                let subtitle = step.defaultSubtitle;

                if (step.key === 'event') {
                  if (trigger) {
                    title = trigger.value;
                    subtitle = `When: ${trigger.value}`;
                  }
                } else if (step.key === 'recipient') {
                  if (selectedRecipients.length > 0) {
                    title = formatRecipientsDisplay(selectedRecipients);
                    subtitle = 'Notification targets';
                  }
                } else if (step.key === 'channel') {
                  if (selectedChannel) {
                    title = selectedChannel;
                    if (selectedChannel === 'Email') {
                      subtitle = emailConfigured ? 'Connected' : 'Kindly integrate email';
                    } else if (selectedChannel === 'WhatsApp') {
                      subtitle = whatsAppConfigured ? 'Connected' : 'Kindly integrate WhatsApp';
                    } else {
                      subtitle = 'In-app notification';
                    }
                  }
                } else if (step.key === 'action') {
                  if (isConfirmed || (actionStepValid && selectedAction)) {
                    title = selectedAction || 'Action Configured';
                    subtitle = 'Immediate delivery';
                  }
                }

                return (
                  <React.Fragment key={step.key}>
                    {/* The Card Wrapper */}
                    <div className="relative flex flex-col items-center shrink-0">
                      {/* Uniform 220px x 92px Workflow Card */}
                      <div
                        onClick={() => {
                          if (isUnlocked) handleCardClick(step.key);
                        }}
                        className={`relative w-[220px] h-[92px] bg-white rounded-xl border-2 p-3.5 shadow-xs transition-all flex flex-col justify-between shrink-0 ${
                          isUnlocked
                            ? 'cursor-pointer hover:shadow-md'
                            : 'opacity-40 cursor-not-allowed pointer-events-none border-slate-200 bg-slate-50/50 shadow-none'
                        } ${
                          isUnlocked && (isActive || isConfirmed) ? borderColor : 'border-slate-200'
                        } ${isActive ? 'ring-2 ring-purple-300 ring-offset-2 shadow-md' : ''}`}
                      >
                        {/* Green Completion Checkmark Overlapping Upper-Right Corner */}
                        {isConfirmed && (
                          <span
                            className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-xs border-2 border-white z-20"
                            title="Stage completed"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}

                        {/* Step Label Badge with Icon */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                              isUnlocked ? badgeStyle : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            {step.icon}
                            {step.label}
                          </span>
                          {!isUnlocked && (
                            <span className="text-slate-400" title="Locked stage">
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Title & Subtitle */}
                        <div className="overflow-hidden">
                          <h3
                            className={`text-sm font-bold truncate leading-snug ${
                              isUnlocked ? 'text-slate-800' : 'text-slate-400'
                            }`}
                            title={title}
                          >
                            {title}
                          </h3>
                          <p
                            className={`text-xs truncate leading-tight mt-0.5 ${
                              isUnlocked ? 'text-slate-500' : 'text-slate-400'
                            }`}
                            title={subtitle}
                          >
                            {subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Card-Anchored Configuration Panel */}
                      {isActive && (
                        <div
                          className={`absolute top-[calc(100%+16px)] z-30 w-[320px] md:w-[340px] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 text-left ${
                            step.key === 'event'
                              ? 'left-0'
                              : step.key === 'recipient'
                                ? 'left-1/2 -translate-x-1/2'
                                : step.key === 'channel'
                                  ? 'left-1/2 -translate-x-1/2'
                                  : 'right-0'
                          }`}
                        >
                          {renderPanelContent(step.key)}
                        </div>
                      )}
                    </div>

                    {/* Dotted Connector Line Strictly In Gap Between Cards (Vertical Midpoint) */}
                    {index < STEPS.length - 1 && (
                      <div className="w-12 md:w-16 h-0 border-t-2 border-dashed border-[#CBD5E1] shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Outer Right Lead-Out Dotted Line */}
              <div className="w-8 md:w-12 h-0 border-t-2 border-dashed border-[#CBD5E1] shrink-0" />
            </div>
          </div>

          {/* C. RECIPIENT PREVIEW CARDS BELOW CARD 4 (ACTION) */}
          {showRecipientResultCards && selectedRecipients.length > 0 && (() => {
            const count = selectedRecipients.length;
            const cardWidth = 350;
            const gap = 24;
            const totalWidth = count * cardWidth + (count - 1) * gap;
            const originX = count === 1 ? totalWidth / 2 : totalWidth - 128;
            const marginRightCalc = count === 1
              ? 'max(16px, calc(50% - 638px))'
              : 'max(16px, calc(50% - 596px))';

            return (
              <div className="relative mt-2 flex flex-col items-center z-10 transition-all duration-300 w-full">
                {/* Branching Gray Curved Dotted Connector Lines */}
                <div
                  className="flex flex-col items-center self-end"
                  style={{ width: `${totalWidth}px`, marginRight: marginRightCalc }}
                >
                  <RecipientConnectors
                    count={count}
                    cardWidth={cardWidth}
                    gap={gap}
                    originXOverride={originX}
                  />

                  {/* Recipient Cards Row */}
                  <div className="flex flex-nowrap items-start justify-end gap-6 w-full">
                    {selectedRecipients.map((recipient) => {
                      const roleLabel = formatRecipientLabel(recipient);
                      const channelLabel = selectedChannel || 'EMAIL';
                      const renderedSubject = previewText(
                        subject || selectedAction || 'Notification',
                        module,
                        recipient,
                        selectedPreviewTask
                      );
                      const renderedBody = previewText(
                        message,
                        module,
                        recipient,
                        selectedPreviewTask
                      );

                      return (
                        <div
                          key={recipient}
                          className="w-[320px] md:w-[350px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left transition-all hover:shadow-md"
                        >
                          {/* Card Top Pill / Header */}
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-purple-50 text-purple-600">
                              {channelLabel.toUpperCase() === 'WHATSAPP' ? (
                                <Send className="h-4 w-4" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                              {roleLabel.toUpperCase()} · {channelLabel.toUpperCase()}
                            </span>
                          </div>

                          {/* Subject Section (for Email) */}
                          {channelLabel.toUpperCase() === 'EMAIL' && renderedSubject && (
                            <div className="mt-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                SUBJECT
                              </span>
                              <h4 className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">
                                {renderedSubject}
                              </h4>
                            </div>
                          )}

                          {/* Message Preview Body */}
                          <div className="mt-4 text-xs md:text-sm text-slate-600 font-sans leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">
                            {renderedBody}
                          </div>

                          {/* Status Footer */}
                          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5 font-medium text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Preview · Not sent
                            </span>
                            <span>{module} Agent</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 3. BOTTOM-LEFT ZOOM & CANVAS CONTROLS */}
        <div className="fixed bottom-6 left-20 z-40 bg-white rounded-xl border border-slate-200 shadow-md flex flex-col p-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.1, 1.3))}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.7))}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
            title="Fit to screen / Reset zoom"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* 4. BOTTOM-RIGHT MINIMAP THUMBNAIL */}
        <div className="fixed bottom-6 right-6 z-40 w-44 h-28 bg-white rounded-lg border-2 border-slate-800 shadow-md p-2 flex flex-col justify-between overflow-hidden pointer-events-none">
          <div className="w-full flex items-center justify-between gap-1 pt-2">
            <div className={`h-4 w-7 rounded-xs border ${confirmedSteps.event || activeStep === 'event' ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-100'}`} />
            <div className="w-2 h-0 border-t border-dashed border-slate-400" />
            <div className={`h-4 w-7 rounded-xs border ${confirmedSteps.recipient || activeStep === 'recipient' ? 'border-purple-500 bg-purple-50' : 'border-slate-300 bg-slate-100'}`} />
            <div className="w-2 h-0 border-t border-dashed border-slate-400" />
            <div className={`h-4 w-7 rounded-xs border ${confirmedSteps.channel || activeStep === 'channel' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-100'}`} />
            <div className="w-2 h-0 border-t border-dashed border-slate-400" />
            <div className={`h-4 w-7 rounded-xs border ${confirmedSteps.action || activeStep === 'action' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-300 bg-slate-100'}`} />
          </div>
          {activePanelOpen && (
            <div className="w-10 h-10 border border-slate-300 bg-slate-50 rounded-xs self-start ml-0.5 mb-1" />
          )}
          <div className="absolute right-1 bottom-1 border border-slate-400/40 bg-slate-200/30 w-16 h-12 rounded-xs" />
        </div>
      </main>
    </div>
  );
}
