import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AgentSchedulerService, formatDateYMD, parseDateOnly, diffInDays } from './scheduler.service';

describe('AgentSchedulerService Unit Tests', () => {
  it('formats dates into YYYY-MM-DD properly', () => {
    const d = new Date(2026, 9, 24); // Oct 24, 2026
    assert.equal(formatDateYMD(d), '2026-10-24');
  });

  it('parses date-only strings and calculates day differences accurately', () => {
    const parsed = parseDateOnly('2026-10-28');
    assert.ok(parsed instanceof Date);
    const base = new Date(2026, 9, 24);
    assert.equal(diffInDays(parsed, base), 4);

    const past = parseDateOnly('2026-10-20');
    assert.ok(past instanceof Date);
    assert.equal(diffInDays(past, base), -4);
  });

  it('instantiates and provides tick method with deterministic now date when disconnected', async () => {
    assert.equal(typeof AgentSchedulerService.tick, 'function');
    assert.equal(typeof AgentSchedulerService.start, 'function');
    assert.equal(typeof AgentSchedulerService.stop, 'function');

    const fixedNow = new Date('2026-10-24T12:00:00.000Z');
    const result = await AgentSchedulerService.tick(fixedNow);
    assert.equal(result.ran, false);
    assert.equal(typeof result.evaluatedAgents, 'number');
    assert.equal(typeof result.dispatchedRuns, 'number');
  });
});
