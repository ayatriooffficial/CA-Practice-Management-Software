import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AgentCenterService } from './agent.service';
import { buildTaskClientLookup, compareCondition, runGraph } from './execution.service';
import { WorkflowGraph, WorkflowNode } from './agent.interface';
import { createAgentSchema } from './agent.validation';

const baseConfig = {
  trigger: 'Task created',
  recipient: ['Assigned user'],
  channel: 'Email',
  action: 'Send notification',
  message: 'Task {{task.taskName}}',
};

const branchGraph = (): WorkflowGraph => ({
  nodes: [
    { id: 'check', type: 'condition', name: 'High priority?', config: { field: 'task.priority', operator: 'equals', value: 'High' } },
    { id: 'notify', type: 'action', name: 'Notify assignee', config: { channel: 'Email', recipient: 'Assigned user', action: 'Send notification', message: 'Hello {{recipient.name}}' } },
  ],
  edges: [
    { id: 'true-path', source: 'check', target: 'notify', sourceHandle: 'true' },
    { id: 'false-path', source: 'check', target: '__end__', sourceHandle: 'false' },
  ],
});

describe('Agent Center graph validation and test traversal', () => {
  it('accepts a connected condition and action graph', () => {
    const result = AgentCenterService.validateConfig('Task', { ...baseConfig, workflowGraph: branchGraph() });
    assert.equal(result.valid, true, result.errors.join(' '));
    assert.equal(result.config?.workflowGraph?.edges.length, 2);
  });

  it('rejects dangling branches and cycles', () => {
    const dangling = branchGraph();
    dangling.edges.pop();
    assert.equal(AgentCenterService.validateConfig('Task', { ...baseConfig, workflowGraph: dangling }).valid, false);

    const cyclic = branchGraph();
    cyclic.edges = [
      { id: 'to-action', source: 'check', target: 'notify', sourceHandle: 'true' },
      { id: 'to-end', source: 'check', target: '__end__', sourceHandle: 'false' },
      { id: 'loop', source: 'notify', target: 'check', sourceHandle: 'next' },
    ];
    assert.equal(AgentCenterService.validateConfig('Task', { ...baseConfig, workflowGraph: cyclic }).valid, false);
  });

  it('rejects malformed graphs even when saving a draft and blocks unavailable triggers', () => {
    const invalidDraft = createAgentSchema.safeParse({
      name: 'Draft workflow', module: 'Task', config: { workflowGraph: { nodes: [{ id: 'x', type: 'condition', name: 'Check', config: {} }], edges: [] } }, saveDraft: true,
    });
    assert.equal(invalidDraft.success, false);

    const unavailable = AgentCenterService.validateConfig('DSC', {
      ...baseConfig,
      trigger: 'DSC expiry approaching',
      conditions: { daysBeforeExpiry: 30 },
    });
    assert.equal(unavailable.valid, false);
    assert.match(unavailable.errors.join(' '), /scheduler/i);
    const dueDateApproaching = AgentCenterService.validateConfig('Task', {
      ...baseConfig,
      trigger: 'Due Date Approaching',
      conditions: { daysBeforeDue: 2 },
    });
    assert.equal(dueDateApproaching.valid, false);
    assert.match(dueDateApproaching.errors.join(' '), /scheduler configuration required/i);
  });

  it('takes the true or false branch using the event record', () => {
    const graph = branchGraph();
    const firstNode = graph.nodes[0] as WorkflowNode;
    assert.equal(compareCondition(firstNode, { task: { priority: 'High' } }).result, true);
    assert.equal(compareCondition(firstNode, { task: { priority: 'Low' } }).result, false);

    const trueRun = runGraph(graph, { previewOnly: true, task: { priority: 'High' } });
    assert.equal(trueRun.trace[0]?.branch, 'true');
    assert.equal(trueRun.results.length, 1);
    assert.equal(trueRun.results[0]?.simulated, true);

    const falseRun = runGraph(graph, { previewOnly: true, task: { priority: 'Low' } });
    assert.equal(falseRun.trace[0]?.branch, 'false');
    assert.equal(falseRun.results.length, 0);
  });

  it('persists the Task-linked Client resolution rule and rejects Client selection for other modules', () => {
    const clientConfig = {
      ...baseConfig,
      recipient: ['Client'],
      recipientResolution: { mode: 'task-linked-client', relationship: 'trigger-record' },
      subject: 'Update for {{client.name}}',
      templateId: 'client-task-update',
      message: 'Hello {{client.name}}',
    };
    const valid = AgentCenterService.validateConfig('Task', clientConfig);
    assert.equal(valid.valid, true, valid.errors.join(' '));
    assert.deepEqual(valid.config?.recipientResolution, { mode: 'task-linked-client', relationship: 'trigger-record' });
    assert.equal(AgentCenterService.validateConfig('DSC', clientConfig).valid, false);
    assert.equal(AgentCenterService.validateConfig('Task', { ...clientConfig, recipientResolution: undefined }).valid, false);
  });

  it('scopes Client recipient lookup to the triggering organization and active records', () => {
    const lookup = buildTaskClientLookup('org-a', '65e0e0d76a9e8a61bfa13524');
    assert.deepEqual(lookup, { _id: '65e0e0d76a9e8a61bfa13524', orgId: 'org-a', active: true, isDeleted: false });
    assert.equal(buildTaskClientLookup('org-a', 'not-an-id'), null);
  });

  it('rejects unknown template variables and unavailable templates', () => {
    assert.equal(AgentCenterService.validateConfig('Task', { ...baseConfig, subject: 'Hi {{task.secretField}}' }).valid, false);
    assert.equal(AgentCenterService.validateConfig('Task', { ...baseConfig, templateId: 'unlisted-template' }).valid, false);
  });

  it('traverses linear action nodes using their persisted next connections', () => {
    const linear: WorkflowGraph = {
      nodes: [
        { id: 'first', type: 'action', name: 'First', config: { channel: 'Email', recipient: 'Assigned user', action: 'Send notification', subject: 'First', message: 'Hello' } },
        { id: 'second', type: 'action', name: 'Second', config: { channel: 'Email', recipient: 'Task owner', action: 'Send notification', subject: 'Second', message: 'Done' } },
      ],
      edges: [
        { id: 'first-next', source: 'first', target: 'second', sourceHandle: 'next' },
        { id: 'second-end', source: 'second', target: '__end__', sourceHandle: 'next' },
      ],
    };
    assert.equal(AgentCenterService.validateConfig('Task', { ...baseConfig, workflowGraph: linear }).valid, true);
    const run = runGraph(linear, { previewOnly: true, task: { taskName: 'Tax filing' } });
    assert.deepEqual(run.trace.map((item) => item.nodeId), ['first', 'second']);
    assert.equal(run.results.length, 2);
    assert.equal(run.results[0]?.status, 'simulated');
  });
});
