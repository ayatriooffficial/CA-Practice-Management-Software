import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { TodoService, isAdminRole, parseDateToYMD, getTodayKolkataYMD } from './todo.service';
import { UserModel } from '../auth/user.model';
import { Task } from '../task/task.model';
import { TodoModel } from './todo.model';

describe('To-Do Module - Role-Based Service & Isolation Tests', () => {
  let adminUser: any;
  let employeeUser: any;
  let otherEmployeeUser: any;
  let testTaskId: string;
  let createdTodoId: string;

  before(async () => {
    await connectDatabase();

    // Fetch existing admin and employee
    adminUser = await UserModel.findOne({ role: 'admin' }).lean();
    employeeUser = await UserModel.findOne({ role: 'employee' }).lean();

    assert.ok(adminUser, 'Admin user must exist in database');
    assert.ok(employeeUser, 'Employee user must exist in database');
  });

  after(async () => {
    // Clean up any test records created
    if (testTaskId) {
      await Task.deleteOne({ taskId: testTaskId });
    }
    if (createdTodoId) {
      await TodoModel.deleteOne({ _id: createdTodoId });
    }
    await disconnectDatabase();
  });

  test('1. isAdminRole helper validates administrative privileges', () => {
    assert.strictEqual(isAdminRole('admin'), true);
    assert.strictEqual(isAdminRole('Admin'), true);
    assert.strictEqual(isAdminRole('owner'), true);
    assert.strictEqual(isAdminRole('partner'), true);
    assert.strictEqual(isAdminRole('manager'), true);

    assert.strictEqual(isAdminRole('employee'), false);
    assert.strictEqual(isAdminRole('staff'), false);
    assert.strictEqual(isAdminRole('associate'), false);
    assert.strictEqual(isAdminRole(undefined), false);
  });

  test('2. getTodoSummary returns role-aware metrics', async () => {
    const adminSummary = await TodoService.getTodoSummary(adminUser.orgId.toString(), {
      userId: adminUser._id.toString(),
      name: adminUser.name,
      role: 'admin',
    });

    assert.strictEqual(adminSummary.role, 'admin');
    assert.ok(typeof adminSummary.adminTasksTotal === 'number');
    assert.ok(typeof adminSummary.teamTasksActive === 'number');
    assert.ok(typeof adminSummary.teamAvgProgress === 'number');

    const empSummary = await TodoService.getTodoSummary(employeeUser.orgId.toString(), {
      userId: employeeUser._id.toString(),
      name: employeeUser.name,
      role: 'employee',
    });

    assert.strictEqual(empSummary.role, 'employee');
    assert.ok(typeof empSummary.assignedTotal === 'number');
    assert.ok(typeof empSummary.overallProgress === 'number');
  });

  test('3. getAdminTasks auto-generates deadlines with deterministic deduplication', async () => {
    const adminTasks = await TodoService.getAdminTasks(adminUser.orgId.toString(), adminUser._id.toString());
    assert.ok(Array.isArray(adminTasks));
    assert.ok(adminTasks.length > 0, 'Should find at least some auto-generated admin tasks (DSC, statutory, etc.)');

    // Ensure all items have dedupKey, valid category, and actionUrl
    const keys = new Set<string>();
    for (const t of adminTasks) {
      assert.ok(t.dedupKey, 'Every administrative task must have a dedupKey');
      assert.ok(t.title, 'Every task must have a title');
      assert.ok(t.category, 'Every task must have a category');
      assert.ok(t.actionUrl, 'Every task must have an actionUrl');
      assert.ok(!keys.has(t.dedupKey), `dedupKey ${t.dedupKey} must be unique`);
      keys.add(t.dedupKey);
    }
  });

  test('4. toggleAdminTask stores persistent resolution', async () => {
    const adminTasks = await TodoService.getAdminTasks(adminUser.orgId.toString(), adminUser._id.toString());
    const target = adminTasks[0];
    assert.ok(target, 'Need a target task to toggle');

    // Toggle to completed
    const result = await TodoService.toggleAdminTask(
      adminUser.orgId.toString(),
      adminUser._id.toString(),
      target.dedupKey,
      true
    );
    assert.strictEqual(result.completed, true);
    assert.strictEqual(result.dedupKey, target.dedupKey);

    // Verify task is now marked completed in list
    const updatedList = await TodoService.getAdminTasks(adminUser.orgId.toString(), adminUser._id.toString());
    const toggledItem = updatedList.find((t) => t.dedupKey === target.dedupKey);
    assert.ok(toggledItem);
    assert.strictEqual(toggledItem.completed, true);

    // Revert toggle
    await TodoService.toggleAdminTask(
      adminUser.orgId.toString(),
      adminUser._id.toString(),
      target.dedupKey,
      false
    );
  });

  test('5. assignTask creates a real Task persisted in database', async () => {
    const todayYMD = getTodayKolkataYMD();
    const created = await TodoService.assignTask(
      adminUser.orgId.toString(),
      {
        userId: adminUser._id.toString(),
        name: adminUser.name,
        role: 'admin',
      },
      {
        taskName: 'Q3 Tax Audit Checklist Execution',
        description: 'Perform complete statutory tax audit checklist',
        category: 'Income Tax',
        priority: 'High',
        assigneeId: employeeUser._id.toString(),
        assigneeName: employeeUser.name,
        targetDueDate: todayYMD,
        checklist: [
          { title: 'Verify 26AS vs Books', isMandatory: true },
          { title: 'Check depreciation schedule', isMandatory: true },
          { title: 'Confirm 80C deductions', isMandatory: false },
        ],
      }
    );

    assert.ok(created);
    assert.ok(created.taskId, 'Assigned task must have a generated taskId');
    assert.strictEqual(created.taskName, 'Q3 Tax Audit Checklist Execution');
    assert.strictEqual(created.assigneeId, employeeUser._id.toString());
    assert.strictEqual(created.progress, 0);
    assert.strictEqual(created.checklist.length, 3);
    testTaskId = created.taskId;
  });

  test('6. getEmployeeTasks strictly enforces employee isolation', async () => {
    // Fetch employee tasks for employeeUser
    const empTasks = await TodoService.getEmployeeTasks(
      employeeUser.orgId.toString(),
      {
        userId: employeeUser._id.toString(),
        name: employeeUser.name,
        role: 'employee',
      }
    );

    assert.ok(Array.isArray(empTasks));
    // The newly created task must be in employeeUser's list
    const found = empTasks.find((t) => t.taskId === testTaskId);
    assert.ok(found, 'Employee must see tasks assigned to them');

    // Verify that all returned tasks belong strictly to employeeUser
    for (const t of empTasks) {
      const matchId = t.assigneeId === employeeUser._id.toString();
      const matchName = t.assigneeName.toLowerCase().trim() === employeeUser.name.toLowerCase().trim();
      assert.ok(matchId || matchName, `Task ${t.taskId} belongs to ${t.assigneeName}, not to ${employeeUser.name}`);
    }

    // Verify a random/other user cannot see employeeUser's task
    const fakeOtherTasks = await TodoService.getEmployeeTasks(
      employeeUser.orgId.toString(),
      {
        userId: '6ad9e23bf460aa2e6102c999',
        name: 'Unrelated User',
        role: 'employee',
      }
    );
    const leaked = fakeOtherTasks.find((t) => t.taskId === testTaskId);
    assert.strictEqual(leaked, undefined, 'Other user must NOT see another employee’s assigned task');
  });

  test('7. updateTaskProgress enforces checklist completion before marking Completed', async () => {
    // Attempting to set status to 'Completed' while mandatory checklist items are incomplete should throw
    await assert.rejects(
      async () => {
        await TodoService.updateTaskProgress(
          employeeUser.orgId.toString(),
          {
            userId: employeeUser._id.toString(),
            name: employeeUser.name,
            role: 'employee',
          },
          testTaskId,
          {
            status: 'Completed',
            progress: 100,
          }
        );
      },
      (err: any) => {
        assert.match(err.message, /Cannot mark task as Completed: \d+ mandatory checklist item/);
        return true;
      }
    );

    // Fetch the task to get checklist item IDs
    const taskDoc = await Task.findOne({ taskId: testTaskId }).lean();
    assert.ok(taskDoc);
    const item1 = taskDoc.checklist[0];
    const item2 = taskDoc.checklist[1];

    // Toggle first item
    const step1 = await TodoService.updateTaskProgress(
      employeeUser.orgId.toString(),
      {
        userId: employeeUser._id.toString(),
        name: employeeUser.name,
        role: 'employee',
      },
      testTaskId,
      {
        toggleChecklistId: item1.id,
        checklistCompleted: true,
      }
    );
    assert.strictEqual(step1.progress, 33); // 1 of 3 = 33%

    // Toggle second item
    const step2 = await TodoService.updateTaskProgress(
      employeeUser.orgId.toString(),
      {
        userId: employeeUser._id.toString(),
        name: employeeUser.name,
        role: 'employee',
      },
      testTaskId,
      {
        toggleChecklistId: item2.id,
        checklistCompleted: true,
      }
    );
    assert.strictEqual(step2.progress, 67); // 2 of 3 = 67%

    // Now all mandatory items are complete; set status to 'Completed'
    const step3 = await TodoService.updateTaskProgress(
      employeeUser.orgId.toString(),
      {
        userId: employeeUser._id.toString(),
        name: employeeUser.name,
        role: 'employee',
      },
      testTaskId,
      {
        status: 'Completed',
        note: 'Completed all audit schedules and verified with manager.',
      }
    );
    assert.strictEqual(step3.status, 'Completed');
    assert.strictEqual(step3.progress, 100);
  });

  test('8. getCalendarEvents returns structured events for To-Do calendar view', async () => {
    const events = await TodoService.getCalendarEvents(
      adminUser.orgId.toString(),
      {
        userId: adminUser._id.toString(),
        name: adminUser.name,
        role: 'admin',
      }
    );

    assert.ok(Array.isArray(events));
    for (const ev of events) {
      assert.ok(ev.id);
      assert.ok(ev.title);
      assert.ok(ev.date, 'Calendar event must have a date');
      assert.match(ev.date, /^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
      assert.ok(['admin_deadline', 'task_due', 'task_start', 'personal_todo'].includes(ev.type), `Unexpected event type: ${ev.type}`);
    }
  });
});
