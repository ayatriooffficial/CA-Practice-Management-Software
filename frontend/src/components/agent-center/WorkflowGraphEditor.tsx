'use client';

import { useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { AgentDefinitions, AgentModule, WorkflowEdge, WorkflowGraph, WorkflowNode } from '@/types/agentCenter';

const fields: Record<AgentModule, string[]> = {
  Task: ['task.priority', 'task.status', 'task.taskName', 'task.clientName', 'task.targetDueDate'],
  DSC: ['dsc.expiryDate'],
  License: ['license.expiryDate'],
};
const commonOperators = ['equals', 'not_equals', 'exists'] as const;
const control = { borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' } as const;

function edge(source: string, target: string, sourceHandle: WorkflowEdge['sourceHandle'] = 'next'): WorkflowEdge {
  return { id: `${source}-${sourceHandle}-${target}`, source, target, sourceHandle };
}

export default function WorkflowGraphEditor({ value, onChange, disabled, module, definitions }: {
  value: WorkflowGraph;
  onChange: (graph: WorkflowGraph) => void;
  disabled?: boolean;
  module: AgentModule;
  definitions: AgentDefinitions;
}) {
  const [selectedId, setSelectedId] = useState(value.nodes[0]?.id || '');
  const moduleFields = fields[module];
  const selectedNode = value.nodes.find((node) => node.id === selectedId) || value.nodes[0];
  const operatorsForField = (field: string) => field.endsWith('Date') || field === 'task.targetDueDate'
    ? [...commonOperators, 'greater_than', 'less_than']
    : field === 'task.taskName' || field === 'task.clientName'
      ? [...commonOperators, 'contains']
      : [...commonOperators];

  function addNode(type: WorkflowNode['type']) {
    if (value.nodes.length >= 12) return;
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const node: WorkflowNode = type === 'action'
      ? { id, type, name: `Send message ${value.nodes.filter((item) => item.type === 'action').length + 1}`, config: { channel: 'Email', recipient: 'Assigned user', action: 'Send notification', templateId: 'custom', subject: 'Task update', message: 'Hello {{recipient.name}}, {{task.taskName}} needs your attention.' } }
      : { id, type, name: `Check condition ${value.nodes.filter((item) => item.type === 'condition').length + 1}`, config: { field: moduleFields[0], operator: 'equals', value: module === 'Task' ? 'High' : '' } };
    const nodes = [...value.nodes, node];
    const edges = [...value.edges];
    const previous = value.nodes[value.nodes.length - 1];
    if (previous?.type === 'action') edges.push(edge(previous.id, id));
    if (type === 'condition') {
      edges.push(edge(id, '__end__', 'true'), edge(id, '__end__', 'false'));
    } else if (previous?.type === 'condition') {
      const prior = edges.find((item) => item.source === previous.id && item.sourceHandle === 'true');
      if (prior) edges.splice(edges.indexOf(prior), 1, edge(previous.id, id, 'true'));
    }
    onChange({ nodes, edges });
    setSelectedId(id);
  }

  function updateNode(id: string, config: Record<string, unknown>) {
    onChange({ ...value, nodes: value.nodes.map((node) => node.id === id ? { ...node, config: { ...node.config, ...config } } : node) });
  }

  function setConnection(source: string, handle: WorkflowEdge['sourceHandle'], target: string) {
    const retained = value.edges.filter((item) => !(item.source === source && item.sourceHandle === handle));
    onChange({ ...value, edges: [...retained, edge(source, target, handle)] });
  }

  function removeNode(id: string) {
    const removedIndex = value.nodes.findIndex((node) => node.id === id);
    const nodes = value.nodes.filter((node) => node.id !== id);
    const edges = value.edges.filter((item) => item.source !== id).map((item) => item.target === id ? edge(item.source, '__end__', item.sourceHandle) : item);
    onChange({ nodes, edges });
    setSelectedId(nodes[Math.max(0, removedIndex - 1)]?.id || nodes[0]?.id || '');
  }

  const selectClass = 'mt-1 w-full rounded-lg border px-2.5 py-2 text-sm';
  const inputClass = 'mt-1 w-full rounded-lg border px-2.5 py-2 text-sm';
  const selectTarget = (node: WorkflowNode, handle: 'next' | 'true' | 'false', label: string) => {
    const target = value.edges.find((item) => item.source === node.id && item.sourceHandle === handle)?.target || '__end__';
    return <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}<select disabled={disabled} value={target} onChange={(event) => setConnection(node.id, handle, event.target.value)} className={selectClass} style={control}><option value="__end__">End workflow</option>{value.nodes.filter((candidate) => candidate.id !== node.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>;
  };

  return <section className="mt-5 rounded-xl border p-4 md:p-5" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-muted)' }}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold" style={{ color: 'var(--text-main)' }}>Connected conditions and actions</h3><p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>This saved graph is the runtime path when it contains nodes. With no graph nodes, the Action stage above runs as the single action.</p></div><div className="flex gap-2"><button type="button" disabled={disabled || value.nodes.length >= 12} onClick={() => addNode('condition')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><Plus className="h-3.5 w-3.5" /> Condition</button><button type="button" disabled={disabled || value.nodes.length >= 12} onClick={() => addNode('action')} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}><Plus className="h-3.5 w-3.5" /> Action</button></div></div>
    {value.nodes.length === 0 ? <p className="mt-4 rounded-lg border border-dashed p-4 text-sm" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>No optional condition or action nodes. The configured Action stage is the workflow’s terminal operation.</p> : <>
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2" aria-label="Saved workflow graph cards">
        {value.nodes.map((node, index) => <div key={node.id} className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setSelectedId(node.id)} className="w-44 rounded-lg border p-3 text-left" style={{ borderColor: selectedNode?.id === node.id ? 'var(--primary)' : 'var(--border-main)', backgroundColor: selectedNode?.id === node.id ? 'var(--primary-light)' : 'var(--bg-surface)' }}><span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>{index + 1} · {node.type}</span><span className="mt-1 block truncate text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{node.name}</span></button>
          {index < value.nodes.length - 1 && value.edges.some((item) => item.source === node.id && item.target === value.nodes[index + 1]?.id) && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: 'var(--primary)' }} />}
        </div>)}
      </div>
      {value.edges.length > 0 && <div className="mb-3 flex flex-wrap gap-2" aria-label="Persisted graph connections">{value.edges.map((item) => <span key={item.id} className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}><strong style={{ color: 'var(--text-main)' }}>{value.nodes.find((node) => node.id === item.source)?.name || item.source}</strong> · {item.sourceHandle || 'next'} → <strong style={{ color: 'var(--text-main)' }}>{item.target === '__end__' ? 'End' : value.nodes.find((node) => node.id === item.target)?.name || item.target}</strong></span>)}</div>}
      {selectedNode && <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="mb-3 flex items-center justify-between gap-2"><div><span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>Configure {selectedNode.type}</span><input aria-label="Step name" value={selectedNode.name} disabled={disabled} onChange={(event) => onChange({ ...value, nodes: value.nodes.map((node) => node.id === selectedNode.id ? { ...node, name: event.target.value } : node) })} className={`${inputClass} mt-1 font-semibold`} style={control} /></div><button type="button" disabled={disabled} onClick={() => removeNode(selectedNode.id)} aria-label={`Remove ${selectedNode.name}`} className="rounded p-2 text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
        {selectedNode.type === 'condition' ? <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Field<select value={String(selectedNode.config.field || moduleFields[0])} disabled={disabled} onChange={(event) => { const field = event.target.value; const allowed = operatorsForField(field); updateNode(selectedNode.id, { field, operator: allowed.includes(selectedNode.config.operator as never) ? selectedNode.config.operator : 'equals' }); }} className={selectClass} style={control}>{moduleFields.map((field) => <option key={field}>{field}</option>)}</select></label><label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Operator<select value={String(selectedNode.config.operator || 'equals')} disabled={disabled} onChange={(event) => updateNode(selectedNode.id, { operator: event.target.value })} className={selectClass} style={control}>{operatorsForField(String(selectedNode.config.field || moduleFields[0])).map((operator) => <option key={operator} value={operator}>{operator.replace('_', ' ')}</option>)}</select></label><label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Compare value<input type={['greater_than', 'less_than'].includes(String(selectedNode.config.operator)) ? 'date' : 'text'} value={String(selectedNode.config.value ?? '')} disabled={disabled || selectedNode.config.operator === 'exists'} onChange={(event) => updateNode(selectedNode.id, { value: event.target.value })} className={inputClass} style={control} /></label><div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">{selectTarget(selectedNode, 'true', 'If true, connect to')}{selectTarget(selectedNode, 'false', 'If false, connect to')}</div></div> : <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Channel<select value={String(selectedNode.config.channel || 'Email')} disabled={disabled} onChange={(event) => updateNode(selectedNode.id, { channel: event.target.value })} className={selectClass} style={control}>{definitions.channels.map((channel) => <option key={channel}>{channel}</option>)}</select></label>
          <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Recipient<select value={String(selectedNode.config.recipient || 'Assigned user')} disabled={disabled} onChange={(event) => updateNode(selectedNode.id, { recipient: event.target.value, recipientResolution: event.target.value === 'Client' ? { mode: 'task-linked-client', relationship: 'trigger-record' } : undefined })} className={selectClass} style={control}>{definitions.recipients.filter((recipient) => recipient !== 'Client' || module === 'Task').map((recipient) => <option key={recipient}>{recipient}</option>)}</select></label>
          {selectedNode.config.channel === 'Email' && <><label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Email template<select value={String(selectedNode.config.templateId || 'custom')} disabled={disabled} onChange={(event) => { const template = definitions.emailTemplates.find((item) => item.id === event.target.value); updateNode(selectedNode.id, { templateId: event.target.value, ...(template ? { subject: template.subject, message: template.message } : {}) }); }} className={selectClass} style={control}><option value="custom">Custom email</option>{(module === 'Task' ? definitions.emailTemplates : []).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Email subject<input maxLength={200} value={String(selectedNode.config.subject || '')} disabled={disabled} onChange={(event) => updateNode(selectedNode.id, { subject: event.target.value })} className={inputClass} style={control} /></label></>}
          <label className="text-xs font-semibold sm:col-span-2" style={{ color: 'var(--text-muted)' }}>{selectedNode.config.channel === 'Email' ? 'Email body' : 'Message'}<textarea rows={4} maxLength={1000} value={String(selectedNode.config.message || '')} disabled={disabled} onChange={(event) => updateNode(selectedNode.id, { message: event.target.value })} className={inputClass} style={control} /></label>
          <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Action<select value={String(selectedNode.config.action || 'Send notification')} disabled={disabled} onChange={(event) => updateNode(selectedNode.id, { action: event.target.value })} className={selectClass} style={control}>{definitions.actions.map((action) => <option key={action}>{action}</option>)}</select></label>
          {selectTarget(selectedNode, 'next', 'After this action, connect to')}
          <p className="text-xs sm:col-span-2" style={{ color: 'var(--text-muted)' }}>The provider outcome is simulated. Client contacts resolve only from the triggering Task’s organization-scoped client record.</p>
        </div>}
      </div>}
    </>}
  </section>;
}
