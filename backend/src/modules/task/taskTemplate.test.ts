import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTaskTemplateSchema, updateTaskTemplateSchema } from './taskTemplate.validation';
import { TaskTemplate } from './taskTemplate.model';
import { TaskService } from './task.service';

describe('Task Template Validation & Service Logic', () => {
  it('validates a correct template schema', () => {
    const validData = {
      templateName: 'GST Monthly Return Filing',
      taskTitle: 'GSTR-3B Filing for Current Period',
      category: 'GST',
      department: 'GST',
      priority: 'High',
      frequency: 'Monthly',
      estimatedHours: '02:30:00',
      billingType: 'Billable',
      description: 'Standard operating procedure for monthly GSTR-3B filing.',
      checklist: [
        { id: 'c1', title: 'Collect sales invoices', isMandatory: true },
        { id: 'c2', title: 'Verify ITC from 2B', isMandatory: true },
        { id: 'c3', title: 'Client confirmation email', isMandatory: false },
      ],
    };

    const parsed = createTaskTemplateSchema.safeParse(validData);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.templateName, 'GST Monthly Return Filing');
      assert.equal(parsed.data.checklist.length, 3);
      assert.equal(parsed.data.checklist[0].isMandatory, true);
    }
  });

  it('rejects creation when required fields are missing', () => {
    const missingName = {
      taskTitle: 'Only Title',
    };
    const parsedName = createTaskTemplateSchema.safeParse(missingName);
    assert.equal(parsedName.success, false);

    const missingTitle = {
      templateName: 'Only Template Name',
    };
    const parsedTitle = createTaskTemplateSchema.safeParse(missingTitle);
    assert.equal(parsedTitle.success, false);
  });

  it('rejects invalid priority', () => {
    const invalidPriority = {
      templateName: 'Audit Review',
      taskTitle: 'Statutory Audit',
      priority: 'SuperUrgent',
    };
    const parsed = createTaskTemplateSchema.safeParse(invalidPriority);
    assert.equal(parsed.success, false);
  });

  it('allows partial updates through updateTaskTemplateSchema', () => {
    const partialData = {
      priority: 'Urgent',
      description: 'Updated instructions for urgent filing',
    };
    const parsed = updateTaskTemplateSchema.safeParse(partialData);
    assert.equal(parsed.success, true);
  });

  it('TaskService.getAllTemplates constructs tenant and deletion filters correctly', async () => {
    const originalFind = TaskTemplate.find;
    let capturedFilter: Record<string, unknown> | null = null;

    TaskTemplate.find = ((filter: Record<string, unknown>) => {
      capturedFilter = filter;
      return {
        sort: () => Promise.resolve([
          { _id: '507f1f77bcf86cd799439011', templateName: 'Mock Template', isDeleted: false },
        ]),
      } as any;
    }) as typeof TaskTemplate.find;

    try {
      const templates = await TaskService.getAllTemplates(
        { search: 'GST', category: 'GST' },
        { userId: 'u1', orgId: 'org123' }
      );

      assert.equal(templates.length, 1);
      assert.ok(capturedFilter);
      assert.deepEqual(capturedFilter, {
        $and: [
          { isDeleted: false },
          { $or: [{ orgId: 'org123' }, { orgId: null }, { orgId: { $exists: false } }] },
          { category: 'GST' },
          {
            $or: [
              { templateName: { $regex: 'GST', $options: 'i' } },
              { taskTitle: { $regex: 'GST', $options: 'i' } },
              { description: { $regex: 'GST', $options: 'i' } },
            ],
          },
        ],
      });
    } finally {
      TaskTemplate.find = originalFind;
    }
  });

  it('TaskService.getTemplateById throws notFound for invalid ObjectId', async () => {
    await assert.rejects(
      TaskService.getTemplateById('invalid-id', { orgId: 'org1' }),
      /Task template not found/
    );
  });
});
