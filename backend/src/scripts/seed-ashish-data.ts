import { connectDatabase, disconnectDatabase } from '../config/database';
import { UserModel } from '../modules/auth/user.model';
import { Task } from '../modules/task/task.model';
import { TodoModel } from '../modules/todo/todo.model';
import { Client } from '../modules/client/client.model';

async function seedAshishData() {
  await connectDatabase();
  console.log('Connected to MongoDB. Checking Ashish employee records...');

  const ashish = await UserModel.findOne({
    $or: [{ email: 'admin@ayatrio.com' }, { name: 'Ashish' }],
  });

  if (!ashish) {
    console.error('Ashish user not found in database!');
    await disconnectDatabase();
    return;
  }

  console.log(`Found Ashish: ${ashish._id} (${ashish.email}), Org: ${ashish.orgId}`);

  // Find a sample client
  const client = (await Client.findOne({ orgId: ashish.orgId })) || (await Client.findOne());
  const clientName = client?.name || 'ZENITH INFOTECH SOLUTIONS PRIVATE LIMITED';
  const clientId = client?._id ? String(client._id) : 'CLT-001';

  // 1. Seed Tasks for Ashish
  const existingTasks = await Task.find({
    orgId: ashish.orgId,
    $or: [
      { assigneeId: String(ashish._id) },
      { assigneeName: 'Ashish' },
      { assigneeId: ashish.email },
    ],
  });

  console.log(`Ashish currently has ${existingTasks.length} tasks.`);

  if (existingTasks.length < 3) {
    const timestamp = Date.now();
    const tasksToInsert = [
      {
        taskId: `TSK-ASH-${timestamp}-1`,
        taskName: 'GST Return 3B Monthly Compliance',
        serviceName: 'GST Compliance & Filing',
        category: 'GST',
        clientName,
        clientId,
        orgId: ashish.orgId,
        assigneeId: String(ashish._id),
        assigneeName: 'Ashish',
        status: 'In Progress',
        targetDueDate: '2026-11-20',
        priority: 'High',
      },
      {
        taskId: `TSK-ASH-${timestamp}-2`,
        taskName: 'Quarterly TDS 26Q Reconciliation',
        serviceName: 'Direct Tax Compliance',
        category: 'TDS',
        clientName,
        clientId,
        orgId: ashish.orgId,
        assigneeId: String(ashish._id),
        assigneeName: 'Ashish',
        status: 'Pending',
        targetDueDate: '2026-11-05',
        priority: 'Medium',
      },
      {
        taskId: `TSK-ASH-${timestamp}-3`,
        taskName: 'MCA Annual ROC Documentation Form-8',
        serviceName: 'Corporate Secretarial & ROC',
        category: 'ROC',
        clientName,
        clientId,
        orgId: ashish.orgId,
        assigneeId: String(ashish._id),
        assigneeName: 'Ashish',
        status: 'Pending',
        targetDueDate: '2026-11-04',
        priority: 'Urgent',
      },
    ];

    for (const t of tasksToInsert) {
      await Task.create(t);
      console.log(`Created task: ${t.taskName} (${t.taskId})`);
    }
  }

  // 2. Seed To-Dos for Ashish
  const existingTodos = await TodoModel.find({
    userId: ashish._id,
  });

  console.log(`Ashish currently has ${existingTodos.length} to-dos.`);

  if (existingTodos.length < 3) {
    const todosToInsert = [
      {
        orgId: ashish.orgId,
        userId: ashish._id,
        title: 'Review statutory invoices and TDS deductions for Zenith',
        description: 'Verify 194C and 194J TDS deductions against GSTR-2B before filing',
        category: 'Direct Tax',
        priority: 'High',
        completed: false,
        dueDate: '2026-11-03',
        status: 'Pending',
        clientName,
        clientId,
      },
      {
        orgId: ashish.orgId,
        userId: ashish._id,
        title: 'Verify DSC token expiration for client directors',
        description: 'Ensure Class 3 signing token is active for MCA Form 8 submission',
        category: 'Compliance',
        priority: 'Medium',
        completed: false,
        dueDate: '2026-11-04',
        status: 'Pending',
        clientName,
        clientId,
      },
      {
        orgId: ashish.orgId,
        userId: ashish._id,
        title: 'Follow up with client accounts team for bank statements',
        description: 'Need October statements in PDF and Excel format for monthly book closure',
        category: 'Accounting',
        priority: 'Urgent',
        completed: false,
        dueDate: '2026-11-03',
        status: 'Pending',
        clientName,
        clientId,
      },
    ];

    for (const todo of todosToInsert) {
      await TodoModel.create(todo);
      console.log(`Created todo: ${todo.title}`);
    }
  }

  console.log('Seeding finished successfully.');
  await disconnectDatabase();
}

seedAshishData().catch(console.error);

