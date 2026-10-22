import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregateEmployeeCosts, aggregatePeriodFacts, calculateProfitPaise, calculateTimeCostPaise } from './financial.calculation';

const from = '2026-07-01';
const to = '2026-07-31';

describe('financial period calculations', () => {
  it('counts issued allocations, subtracts credit notes, sums time and approved expenses once', () => {
    const facts = aggregatePeriodFacts([
      { id: 'issued', kind: 'invoice', state: 'issued', issueDate: new Date('2026-07-01T00:00:00Z'), allocations: [{ taskId: 'T-1', amountPaise: 100_000 }] },
      { id: 'draft', kind: 'invoice', state: 'draft', issueDate: new Date('2026-07-15T00:00:00Z'), allocations: [{ taskId: 'T-1', amountPaise: 50_000 }] },
      { id: 'void', kind: 'invoice', state: 'void', issueDate: new Date('2026-07-18T00:00:00Z'), allocations: [{ taskId: 'T-1', amountPaise: 40_000 }] },
      { id: 'credit', kind: 'credit_note', state: 'issued', issueDate: new Date('2026-07-31T23:59:59Z'), allocations: [{ taskId: 'T-1', amountPaise: 20_000 }] },
    ], [
      { id: 'time-1', taskId: 'T-1', workDate: new Date('2026-07-03T12:00:00Z'), costPaise: 10_000 },
      { id: 'time-2', taskId: 'T-1', workDate: new Date('2026-07-04T12:00:00Z'), costPaise: 5_000 },
      { id: 'time-2', taskId: 'T-1', workDate: new Date('2026-07-04T12:00:00Z'), costPaise: 5_000 },
      { id: 'outside-time', taskId: 'T-1', workDate: new Date('2026-08-01T00:00:00Z'), costPaise: 99_000 },
    ], [
      { id: 'approved', taskId: 'T-1', state: 'approved', incurredDate: new Date('2026-07-31T23:59:00Z'), amountPaise: 4_000 },
      { id: 'pending', taskId: 'T-1', state: 'pending', incurredDate: new Date('2026-07-10T00:00:00Z'), amountPaise: 90_000 },
      { id: 'rejected', taskId: 'T-1', state: 'rejected', incurredDate: new Date('2026-07-11T00:00:00Z'), amountPaise: 80_000 },
      { id: 'outside-expense', taskId: 'T-1', state: 'approved', incurredDate: new Date('2026-06-30T23:59:59Z'), amountPaise: 70_000 },
    ], from, to);

    assert.deepEqual(facts.get('T-1'), {
      revenuePaise: 80_000,
      revenueRecords: 2,
      laborPaise: 15_000,
      timeRecords: 2,
      expensePaise: 4_000,
      expenseRecords: 1,
    });
    assert.equal(calculateProfitPaise(80_000, 15_000, 4_000), 61_000);
  });

  it('uses inclusive date boundaries and preserves negative profit', () => {
    const facts = aggregatePeriodFacts([
      { id: 'from', kind: 'invoice', state: 'issued', issueDate: new Date('2026-07-01T00:00:00Z'), allocations: [{ taskId: 'T-2', amountPaise: 50_000 }] },
      { id: 'to', kind: 'invoice', state: 'issued', issueDate: new Date('2026-07-31T23:59:59Z'), allocations: [{ taskId: 'T-2', amountPaise: 50_000 }] },
      { id: 'after', kind: 'invoice', state: 'issued', issueDate: new Date('2026-08-01T00:00:00Z'), allocations: [{ taskId: 'T-2', amountPaise: 99_000 }] },
    ], [], [], from, to);
    assert.equal(facts.get('T-2')?.revenuePaise, 100_000);
    assert.equal(calculateProfitPaise(50_000, 80_000, 5_000), -35_000);
  });

  it('keeps missing inputs unavailable and rounds recorded labor to paise', () => {
    assert.equal(calculateProfitPaise(100, null, 0), null);
    assert.equal(calculateProfitPaise(null, 0, 0), null);
    assert.equal(calculateTimeCostPaise(1800, 101), 51);
  });

  it('aggregates employee views from the same task time facts without duplicate time entries', () => {
    const result = aggregateEmployeeCosts([
      { id: 'e-1', employeeId: 'A', employeeName: 'Asha', taskId: 'T-1', costPaise: 1_000 },
      { id: 'e-2', employeeId: 'A', employeeName: 'Asha', taskId: 'T-1', costPaise: 2_000 },
      { id: 'e-2', employeeId: 'A', employeeName: 'Asha', taskId: 'T-1', costPaise: 2_000 },
      { id: 'e-3', employeeId: 'A', employeeName: 'Asha', taskId: 'T-2', costPaise: 3_000 },
      { id: 'e-4', employeeId: 'B', employeeName: 'Bala', taskId: 'T-1', costPaise: 4_000 },
    ]);
    assert.equal(result.byTask.get('T-1')?.get('A')?.costPaise, 3_000);
    assert.deepEqual(result.employees.map(({ employeeId, manpowerCostPaise, taskCount }) => ({ employeeId, manpowerCostPaise, taskCount })), [
      { employeeId: 'A', manpowerCostPaise: 6_000, taskCount: 2 },
      { employeeId: 'B', manpowerCostPaise: 4_000, taskCount: 1 },
    ]);
  });
});
