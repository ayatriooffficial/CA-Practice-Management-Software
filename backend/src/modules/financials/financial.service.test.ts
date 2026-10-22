import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FinancialService } from './financial.service';
import { FinancialInvoice } from './financial.model';
import { Task } from '../task/task.model';

describe('financial service access and record relationships', () => {
  it('rejects expense approval by a non-reviewer before accessing a record', async () => {
    await assert.rejects(
      FinancialService.setExpenseState('000000000000000000000001', 'approved', {
        userId: '000000000000000000000002', orgId: '000000000000000000000003', role: 'staff',
      }),
      /Only an organization manager can review expenses/
    );
  });

  it('scopes invoice task relationship checks to the caller organization', async () => {
    const originalInvoiceFindOne = FinancialInvoice.findOne;
    const originalTaskFind = Task.find;
    let query: Record<string, unknown> | null = null;
    FinancialInvoice.findOne = (() => Promise.resolve(null)) as typeof FinancialInvoice.findOne;
    Task.find = ((filter: Record<string, unknown>) => {
      query = filter;
      return { select: () => ({ lean: async () => [] }) } as unknown as ReturnType<typeof Task.find>;
    }) as typeof Task.find;

    try {
      await assert.rejects(FinancialService.createInvoice({
        kind: 'invoice', state: 'draft', number: 'TEST-1', allocations: [{ taskId: 'T-1', amountPaise: 100 }],
        details: { clientId: 'client-1', totalPayable: 1 }, idempotencyKey: 'invoice-test-key-1',
      }, { userId: '000000000000000000000002', orgId: '000000000000000000000003', role: 'admin' }), /task in your organization/);
      assert.deepEqual(query, { taskId: { $in: ['T-1'] }, orgId: '000000000000000000000003', isDeleted: false });
    } finally {
      FinancialInvoice.findOne = originalInvoiceFindOne;
      Task.find = originalTaskFind;
    }
  });
});
