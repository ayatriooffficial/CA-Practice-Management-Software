import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commitWorkflowStage,
  createStageCommitGuard,
  inferCompletedWorkflowStages,
  invalidateWorkflowStagesFrom,
  isWorkflowStageUnlocked,
  restoreWorkflowStageProgress,
  WorkflowStageProgress,
} from './workflowStageProgress';

test('only Event is unlocked initially, and reopening infers only a valid sequential prefix', () => {
  const progress: WorkflowStageProgress = {};
  assert.equal(isWorkflowStageUnlocked('event', progress), true);
  assert.equal(isWorkflowStageUnlocked('recipient', progress), false);
  assert.equal(isWorkflowStageUnlocked('channel', progress), false);
  assert.equal(isWorkflowStageUnlocked('action', progress), false);
  assert.deepEqual(inferCompletedWorkflowStages({ event: true, recipient: false, channel: true, action: true }), { event: true });
  assert.deepEqual(restoreWorkflowStageProgress({ event: true, recipient: true, channel: true, action: true }, { event: true, recipient: true }), { event: true, recipient: true });
  assert.deepEqual(restoreWorkflowStageProgress({ event: true, recipient: false, channel: true, action: true }, { event: true, recipient: true, channel: true, action: true }), { event: true });
});

test('selecting an option alone must not unlock the next stage until committed', () => {
  const _config = { trigger: 'Task created', recipient: [] };
  const progress: WorkflowStageProgress = {};
  // Selecting a trigger does not alter progress
  assert.equal(isWorkflowStageUnlocked('recipient', progress), false);
  assert.equal(isWorkflowStageUnlocked('channel', progress), false);
  assert.equal(isWorkflowStageUnlocked('action', progress), false);
});

test('invalid Event configuration does not save or unlock Recipient', async () => {
  let saves = 0;
  const result = await commitWorkflowStage('event', {}, () => 'Choose a supported trigger.', async () => { saves += 1; });
  assert.deepEqual(result, { ok: false, reason: 'invalid', message: 'Choose a supported trigger.' });
  assert.equal(saves, 0);
  assert.equal(isWorkflowStageUnlocked('recipient', {}), false);
});

test('invalid downstream stage configuration does not save or unlock its successor', async () => {
  let saves = 0;
  const progress: WorkflowStageProgress = { event: true, recipient: true };
  const result = await commitWorkflowStage('channel', progress, () => 'Select a valid channel before continuing.', async () => { saves += 1; });
  assert.deepEqual(result, { ok: false, reason: 'invalid', message: 'Select a valid channel before continuing.' });
  assert.equal(saves, 0);
  assert.equal(isWorkflowStageUnlocked('action', progress), false);
});

test('a valid stage advances only after its save callback succeeds', async () => {
  const result = await commitWorkflowStage('event', {}, () => undefined, async () => undefined);
  assert.deepEqual(result, { ok: true, progress: { event: true }, nextStage: 'recipient' });
  if (result.ok) {
    assert.equal(isWorkflowStageUnlocked('recipient', result.progress), true);
    assert.equal(isWorkflowStageUnlocked('channel', result.progress), false);
  }
});

test('full sequential progression unlocks stages in strict order: Event -> Recipient -> Channel -> Action', async () => {
  let progress: WorkflowStageProgress = {};

  // Stage 1: Event
  assert.equal(isWorkflowStageUnlocked('event', progress), true);
  assert.equal(isWorkflowStageUnlocked('recipient', progress), false);
  const eventRes = await commitWorkflowStage('event', progress, () => undefined, async () => undefined);
  assert.equal(eventRes.ok, true);
  if (eventRes.ok) progress = eventRes.progress;

  // Stage 2: Recipient
  assert.equal(isWorkflowStageUnlocked('recipient', progress), true);
  assert.equal(isWorkflowStageUnlocked('channel', progress), false);
  const recRes = await commitWorkflowStage('recipient', progress, () => undefined, async () => undefined);
  assert.equal(recRes.ok, true);
  if (recRes.ok) progress = recRes.progress;

  // Stage 3: Channel
  assert.equal(isWorkflowStageUnlocked('channel', progress), true);
  assert.equal(isWorkflowStageUnlocked('action', progress), false);
  const chanRes = await commitWorkflowStage('channel', progress, () => undefined, async () => undefined);
  assert.equal(chanRes.ok, true);
  if (chanRes.ok) progress = chanRes.progress;

  // Stage 4: Action
  assert.equal(isWorkflowStageUnlocked('action', progress), true);
  const actRes = await commitWorkflowStage('action', progress, () => undefined, async () => undefined);
  assert.equal(actRes.ok, true);
  if (actRes.ok) {
    progress = actRes.progress;
    assert.equal(actRes.nextStage, undefined);
  }

  assert.deepEqual(progress, { event: true, recipient: true, channel: true, action: true });
});

test('save failures keep the stage incomplete and return a visible error', async () => {
  const result = await commitWorkflowStage('recipient', { event: true }, () => undefined, async () => { throw new Error('Network unavailable'); });
  assert.deepEqual(result, { ok: false, reason: 'save-failed', message: 'Network unavailable' });
  assert.equal(isWorkflowStageUnlocked('channel', { event: true }), false);
});

test('duplicate submission guard prevents overlapping concurrent commits', async () => {
  const guard = createStageCommitGuard();
  let completed = 0;

  const slowSave = () => new Promise<string>((resolve) => {
    setTimeout(() => {
      completed += 1;
      resolve('done');
    }, 50);
  });

  const firstCall = guard(slowSave);
  const secondCall = guard(slowSave);

  const [firstRes, secondRes] = await Promise.all([firstCall, secondCall]);
  assert.equal(firstRes, 'done');
  assert.deepEqual(secondRes, { ok: false, reason: 'busy', message: 'A stage save is already in progress.' });
  assert.equal(completed, 1);
});

test('locked stages cannot be committed, and editing an earlier stage invalidates only its progress suffix', async () => {
  let saves = 0;
  const progress = { event: true };
  const result = await commitWorkflowStage('channel', progress, () => undefined, async () => { saves += 1; });
  assert.equal(result.ok, false);
  assert.equal(saves, 0);
  assert.deepEqual(invalidateWorkflowStagesFrom({ event: true, recipient: true, channel: true }, 'recipient'), { event: true });
});

test('invalidating an earlier stage preserves downstream draft configuration and workflowGraph', () => {
  const draftConfig = {
    trigger: 'Task created',
    recipient: ['Client', 'Assigned user'],
    channel: 'Email',
    action: 'Send notification',
    workflowGraph: {
      nodes: [
        { id: 'cond-1', type: 'condition', name: 'Check priority', config: { field: 'task.priority', operator: 'equals', value: 'High' } },
        { id: 'act-1', type: 'action', name: 'Notify Client', config: { channel: 'Email', recipient: 'Client', action: 'Send notification', message: 'Hi' } },
      ],
      edges: [
        { id: 'e1', source: 'cond-1', target: 'act-1', sourceHandle: 'true' },
        { id: 'e2', source: 'cond-1', target: '__end__', sourceHandle: 'false' },
      ],
    },
    workflowStageProgress: { event: true, recipient: true, channel: true, action: true },
  };

  // When stage 'event' is reopened and updated, invalidate progress suffix
  const nextProgress = invalidateWorkflowStagesFrom(draftConfig.workflowStageProgress, 'event');
  assert.deepEqual(nextProgress, {});

  // Downstream config, recipients, and workflowGraph must remain intact
  assert.deepEqual(draftConfig.recipient, ['Client', 'Assigned user']);
  assert.equal(draftConfig.channel, 'Email');
  assert.equal(draftConfig.action, 'Send notification');
  assert.equal(draftConfig.workflowGraph.nodes.length, 2);
  assert.equal(draftConfig.workflowGraph.edges.length, 2);
});

test('reopening a saved workflow restores progress up to the first invalid stage', () => {
  // Case A: all stages valid
  const allValid = { event: true, recipient: true, channel: true, action: true };
  const savedAll = { event: true, recipient: true, channel: true, action: true };
  assert.deepEqual(restoreWorkflowStageProgress(allValid, savedAll), { event: true, recipient: true, channel: true, action: true });

  // Case B: channel became invalid (e.g. missing channel setting)
  const channelInvalid = { event: true, recipient: true, channel: false, action: true };
  assert.deepEqual(restoreWorkflowStageProgress(channelInvalid, savedAll), { event: true, recipient: true });

  // Case C: no saved progress, infer from validity
  assert.deepEqual(restoreWorkflowStageProgress(allValid, undefined), { event: true, recipient: true, channel: true, action: true });
});
