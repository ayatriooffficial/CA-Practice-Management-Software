import mongoose from 'mongoose';
import { TodoModel } from './todo.model';
import { Task } from '../task/task.model';
import { Client } from '../client/client.model';
import { UserModel } from '../auth/user.model';
import {
  IAdminTaskItem,
  ITeamTaskItem,
  ITodoSummary,
  ITodoCalendarEvent,
  TaskPriority,
} from './todo.interface';
import { CounterService } from '../counter/counter.service';
import { AppError } from '../../shared/utils/apiError';
import { logger } from '../../config/logger';

// Helper to determine if a role has Administrative privileges
export function isAdminRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return ['admin', 'owner', 'partner', 'manager'].includes(r);
}

// Convert any standard date format to YYYY-MM-DD in Asia/Kolkata timezone
export function parseDateToYMD(dateVal: any): string | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const s = dateVal.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Helper to resolve task due date across targetDueDate, complianceStatus, dueDate, startDate, or createdAt
export function resolveTaskDueDate(task: any): string {
  if (!task) return '';
  const candidate =
    task.targetDueDate ||
    task.complianceStatus?.dueDate ||
    task.dueDate ||
    task.endDate ||
    task.startDate ||
    task.createdAt;
  return parseDateToYMD(candidate) || '';
}

// Today string in Asia/Kolkata YYYY-MM-DD
export function getTodayKolkataYMD(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Difference in calendar days between target and today (positive = future, negative = past/overdue)
export function getDaysLeft(targetYMD: string, todayYMD: string): number {
  const [tY, tM, tD] = targetYMD.split('-').map(Number);
  const [cY, cM, cD] = todayYMD.split('-').map(Number);
  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const currentUtc = Date.UTC(cY, cM - 1, cD);
  return Math.round((targetUtc - currentUtc) / (1000 * 60 * 60 * 24));
}

export class TodoService {
  /**
   * 1. Get role-based To-Do summary stats
   */
  static async getTodoSummary(
    orgId: string,
    user: { userId: string; name: string; role: string }
  ): Promise<ITodoSummary> {
    const isAdmin = isAdminRole(user.role);
    const todayYMD = getTodayKolkataYMD();

    if (isAdmin) {
      const adminTasks = await this.getAdminTasks(orgId, user.userId);
      const pendingAdmin = adminTasks.filter((t) => !t.completed);
      const urgentAdmin = pendingAdmin.filter((t) => t.priority === 'Urgent' || t.status === 'Expired');
      const completedAdmin = adminTasks.filter((t) => t.completed);

      // Team tasks stats
      const allTeamTasks = await Task.find({ isDeleted: false }).select(
        'status targetDueDate checklist progress'
      ).lean();

      let activeCount = 0;
      let overdueCount = 0;
      let completedCount = 0;
      let progressSum = 0;

      for (const t of allTeamTasks) {
        if (t.status === 'Completed') {
          completedCount++;
          progressSum += 100;
        } else if (t.status !== 'Cancelled') {
          activeCount++;
          const dueYMD = parseDateToYMD(t.targetDueDate);
          if (dueYMD && dueYMD < todayYMD) {
            overdueCount++;
          }
          const chkTotal = t.checklist?.length || 0;
          const chkDone = t.checklist?.filter((c: any) => c.completed).length || 0;
          const prg = chkTotal > 0 ? Math.round((chkDone / chkTotal) * 100) : (t.progress || 0);
          progressSum += prg;
        }
      }

      const totalCalculated = activeCount + completedCount;
      const avgProgress = totalCalculated > 0 ? Math.round(progressSum / totalCalculated) : 0;

      return {
        role: 'admin',
        adminTasksTotal: pendingAdmin.length,
        adminTasksUrgent: urgentAdmin.length,
        adminTasksCompleted: completedAdmin.length,
        teamTasksActive: activeCount,
        teamTasksOverdue: overdueCount,
        teamTasksCompleted: completedCount,
        teamAvgProgress: avgProgress,
      };
    } else {
      // Normal Employee stats
      const userConditions: any[] = [];
      if (user.userId) userConditions.push({ assigneeId: user.userId });
      if (user.name) userConditions.push({ assigneeName: new RegExp(`^${user.name}$`, 'i') });

      const empTasks = await Task.find({
        isDeleted: false,
        $or: userConditions,
      }).select('status targetDueDate checklist progress').lean();

      let total = 0;
      let pending = 0;
      let inProgress = 0;
      let overdue = 0;
      let completed = 0;
      let progressSum = 0;

      for (const t of empTasks) {
        total++;
        const isDone = t.status === 'Completed';
        const dueYMD = parseDateToYMD(t.targetDueDate);

        if (isDone) {
          completed++;
          progressSum += 100;
        } else {
          if (t.status === 'In Progress') inProgress++;
          else pending++;

          if (dueYMD && dueYMD < todayYMD) overdue++;

          const chkTotal = t.checklist?.length || 0;
          const chkDone = t.checklist?.filter((c: any) => c.completed).length || 0;
          const prg = chkTotal > 0 ? Math.round((chkDone / chkTotal) * 100) : (t.progress || 0);
          progressSum += prg;
        }
      }

      return {
        role: 'employee',
        assignedTotal: total,
        assignedPending: pending,
        assignedInProgress: inProgress,
        assignedOverdue: overdue,
        assignedCompleted: completed,
        overallProgress: total > 0 ? Math.round(progressSum / total) : 0,
      };
    }
  }

  /**
   * 2. Get Administrative To-Do items (Admin view)
   * Generated dynamically from real Clients, DSCs, Licenses, Documents, and Tasks.
   * Deduplicated via deterministic dedupKey and synced with TodoModel resolution state.
   */
  static async getAdminTasks(
    _orgId: string,
    _userId: string,
    filters?: { category?: string; status?: string; search?: string }
  ): Promise<IAdminTaskItem[]> {
    const todayYMD = getTodayKolkataYMD();
    const taskItemsMap = new Map<string, IAdminTaskItem>();

    // A. Query all real non-deleted Clients
    const clients = await Client.find({ isDeleted: false })
      .select('name legalName fileNo dscs licenses customerFiles documentsInOut status')
      .lean();

    for (const client of clients) {
      const clientIdStr = client._id.toString();
      const clientName = client.name || client.legalName || 'Client';

      // 1. DSCs: Expiry approaching or expired
      for (const dsc of client.dscs || []) {
        const dscName = dsc.name || 'Digital Signature';
        const dscKey = String(dsc.dscId || dsc.id || dscName).trim();
        const expYMD = parseDateToYMD(dsc.expiryDate);

        if (expYMD) {
          const daysLeft = getDaysLeft(expYMD, todayYMD);
          const isExpired = daysLeft < 0 || String(dsc.status || '').toLowerCase() === 'expired';
          const isApproaching = daysLeft >= 0 && daysLeft <= 60;

          if (isExpired || isApproaching) {
            const dedupKey = `admin:dsc:${clientIdStr}:${dscKey}:${expYMD}`;
            const priority: TaskPriority = daysLeft < 0 || daysLeft <= 7 ? 'Urgent' : 'High';
            const status = daysLeft < 0 ? 'Expired' : 'Expiring Soon';
            const title = `Renew DSC – ${dscName} (${clientName})`;
            const description = daysLeft < 0
              ? `Digital Signature expired on ${dsc.expiryDate}. Token serial: ${dsc.remarks || dsc.vendor || 'N/A'}. Immediate renewal required.`
              : `Digital Signature expires in ${daysLeft} days on ${dsc.expiryDate}. Initiate client renewal and token verification.`;

            taskItemsMap.set(dedupKey, {
              id: dedupKey,
              dedupKey,
              title,
              description,
              category: 'DSC',
              sourceType: 'dsc',
              sourceId: dsc.id || dsc.dscId,
              clientName,
              clientId: clientIdStr,
              dueDate: expYMD,
              daysLeft,
              priority,
              status,
              actionUrl: `/dsc`,
              actionLabel: 'Open DSC Vault',
              completed: false,
              completedAt: null,
              createdAt: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // 2. Licenses: Expiry approaching or expired
      for (const lic of client.licenses || []) {
        const licName = lic.name || 'Statutory License';
        const licNo = lic.licenseNo && lic.licenseNo !== '-' ? lic.licenseNo : '';
        const expYMD = parseDateToYMD(lic.expiryDate);

        if (expYMD) {
          const daysLeft = getDaysLeft(expYMD, todayYMD);
          const isExpired = daysLeft < 0;
          const isApproaching = daysLeft >= 0 && daysLeft <= 60;

          if (isExpired || isApproaching) {
            const dedupKey = `admin:license:${clientIdStr}:${lic.id || licName}:${expYMD}`;
            const priority: TaskPriority = daysLeft < 0 ? 'Urgent' : daysLeft <= 15 ? 'High' : 'Medium';
            const status = daysLeft < 0 ? 'Expired' : 'Expiring Soon';
            const title = `Review License Renewal – ${licName} (${clientName})`;
            const description = daysLeft < 0
              ? `Practice license ${licNo ? '(' + licNo + ')' : ''} expired on ${lic.expiryDate}. Initiate renewal filing.`
              : `Practice license ${licNo ? '(' + licNo + ')' : ''} expires in ${daysLeft} days on ${lic.expiryDate}. Prepare renewal documentation.`;

            taskItemsMap.set(dedupKey, {
              id: dedupKey,
              dedupKey,
              title,
              description,
              category: 'License',
              sourceType: 'license',
              sourceId: lic.id,
              clientName,
              clientId: clientIdStr,
              dueDate: expYMD,
              daysLeft,
              priority,
              status,
              actionUrl: `/client/${clientIdStr}?tab=licenses`,
              actionLabel: 'View License',
              completed: false,
              completedAt: null,
              createdAt: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // 3. Documents In/Out pending return
      for (const doc of client.documentsInOut || []) {
        if (doc.status === 'Out' || doc.returnable === true || doc.returnable === 'Yes') {
          const docId = doc.id || doc.documentName;
          const dedupKey = `admin:doc_out:${clientIdStr}:${docId}`;
          const retYMD = parseDateToYMD(doc.returnDate) || todayYMD;
          const daysLeft = getDaysLeft(retYMD, todayYMD);

          taskItemsMap.set(dedupKey, {
            id: dedupKey,
            dedupKey,
            title: `Track Document Return – ${doc.documentName} (${clientName})`,
            description: `Original document handed to ${doc.personName || 'client'} on ${doc.date || 'prior date'} pending physical return.`,
            category: 'Document',
            sourceType: 'document',
            sourceId: doc.id,
            clientName,
            clientId: clientIdStr,
            dueDate: retYMD,
            daysLeft,
            priority: daysLeft < 0 ? 'High' : 'Medium',
            status: daysLeft < 0 ? 'Expired' : 'Pending',
            actionUrl: `/documents`,
            actionLabel: 'View Documents',
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Missing Mandatory Statutory Documents
      for (const stat of client.customerFiles?.statutory || []) {
        if (!stat.attachment && stat.type) {
          const dedupKey = `admin:stat_doc:${clientIdStr}:${stat.type}`;
          taskItemsMap.set(dedupKey, {
            id: dedupKey,
            dedupKey,
            title: `Collect Statutory Document – ${stat.type} (${clientName})`,
            description: `Mandatory ${stat.type} document record has ID ${stat.idNo || 'registered'} but no uploaded file attachment.`,
            category: 'Document',
            sourceType: 'document',
            sourceId: stat.type,
            clientName,
            clientId: clientIdStr,
            dueDate: todayYMD,
            daysLeft: 0,
            priority: 'Medium',
            status: 'Pending',
            actionUrl: `/documents`,
            actionLabel: 'Collect Document',
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // B. Query Tasks with Pending Document Requests or Ready for Final Review
    const tasks = await Task.find({ isDeleted: false })
      .select('taskId taskName clientName clientId targetDueDate priority status documentRequests')
      .lean();

    for (const t of tasks) {
      const clientIdStr = t.clientId || '';
      const clientName = t.clientName || 'Client';
      const dueYMD = parseDateToYMD(t.targetDueDate) || todayYMD;
      const daysLeft = getDaysLeft(dueYMD, todayYMD);

      // Pending document requests
      for (const req of t.documentRequests || []) {
        if (req.status === 'Pending' || req.status === 'Requested') {
          const reqId = req.id || req.title;
          const dedupKey = `admin:task_dreq:${t.taskId}:${reqId}`;
          taskItemsMap.set(dedupKey, {
            id: dedupKey,
            dedupKey,
            title: `Collect Pending Document – ${req.title} (${clientName})`,
            description: `Mandatory document "${req.title}" requested for Task #${t.taskId} (${t.taskName}) is pending submission from client.`,
            category: 'Document',
            sourceType: 'document',
            sourceId: req.id,
            clientName,
            clientId: clientIdStr,
            dueDate: dueYMD,
            daysLeft,
            priority: t.priority || 'Medium',
            status: 'Pending',
            actionUrl: `/documents`,
            actionLabel: 'Document Tracking',
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Review required tasks
      if (t.status === 'Sent for Review') {
        const dedupKey = `admin:task_review:${t.taskId}`;
        taskItemsMap.set(dedupKey, {
          id: dedupKey,
          dedupKey,
          title: `Review Completed Task – ${t.taskName} (${clientName})`,
          description: `Task #${t.taskId} has been submitted by team member for administrative review and filing approval.`,
          category: 'Task Review',
          sourceType: 'task',
          sourceId: t.taskId,
          clientName,
          clientId: clientIdStr,
          dueDate: dueYMD,
          daysLeft,
          priority: 'High',
          status: 'Pending',
          actionUrl: `/task/view/${t.taskId}`,
          actionLabel: 'Review Task',
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // C. Reconcile with persistent resolutions in TodoModel (overrides & manual tasks)
    const storedTodos = await TodoModel.find().lean();
    for (const stored of storedTodos) {
      if (stored.dedupKey && taskItemsMap.has(stored.dedupKey)) {
        const item = taskItemsMap.get(stored.dedupKey)!;
        item.completed = stored.completed;
        if (stored.completed) {
          item.status = 'Completed';
          item.completedAt = stored.completedAt ? stored.completedAt.toISOString() : new Date().toISOString();
        }
      } else if (stored.sourceType === 'manual' || !stored.dedupKey) {
        // Manual admin personal to-do
        const manualKey = `manual:${stored._id.toString()}`;
        const mDueYMD = parseDateToYMD(stored.dueDate) || todayYMD;
        const mDaysLeft = getDaysLeft(mDueYMD, todayYMD);

        taskItemsMap.set(manualKey, {
          id: stored._id.toString(),
          dedupKey: manualKey,
          title: stored.title,
          description: stored.description || 'Personal administrative task',
          category: 'Personal',
          sourceType: 'manual',
          sourceId: stored._id.toString(),
          clientName: stored.clientName || 'Internal Firm',
          clientId: stored.clientId || undefined,
          dueDate: mDueYMD,
          daysLeft: mDaysLeft,
          priority: (stored.priority as TaskPriority) || 'Medium',
          status: stored.completed ? 'Completed' : mDaysLeft < 0 ? 'Expired' : 'Pending',
          actionUrl: `/to-do`,
          actionLabel: 'View Task',
          completed: stored.completed,
          completedAt: stored.completedAt ? stored.completedAt.toISOString() : null,
          createdAt: stored.createdAt.toISOString(),
          updatedAt: stored.updatedAt.toISOString(),
        });
      }
    }

    // D. Query tasks directly assigned to Admin in the Task collection
    const adminUserConditions: any[] = [];
    if (_userId) adminUserConditions.push({ assigneeId: _userId });
    adminUserConditions.push({ assigneeName: new RegExp('admin', 'i') });
    adminUserConditions.push({ assigneeName: new RegExp('Ayatrio Admin', 'i') });

    const adminAssignedTasks = await Task.find({
      isDeleted: false,
      $or: adminUserConditions,
    }).lean();

    for (const at of adminAssignedTasks) {
      const taskKey = `admin:assigned_task:${at.taskId || (at as any)._id.toString()}`;
      const dueYMD = resolveTaskDueDate(at) || todayYMD;
      const daysLeft = getDaysLeft(dueYMD, todayYMD);
      const isDone = at.status === 'Completed';

      taskItemsMap.set(taskKey, {
        id: (at as any)._id.toString(),
        dedupKey: taskKey,
        title: at.taskName || 'Assigned Task',
        description: at.description || 'Task assigned to Admin',
        category: (at.category as any) || 'Compliance',
        sourceType: 'task',
        sourceId: at.taskId,
        clientName: at.clientName || 'General Client',
        clientId: at.clientId || undefined,
        dueDate: dueYMD,
        daysLeft,
        priority: (at.priority as TaskPriority) || 'Medium',
        status: isDone ? 'Completed' : daysLeft < 0 ? 'Expired' : 'Pending',
        actionUrl: `/task/view/${at.taskId}`,
        actionLabel: 'Open Task',
        completed: isDone,
        completedAt: isDone ? (at.updatedAt ? new Date(at.updatedAt).toISOString() : new Date().toISOString()) : null,
        createdAt: at.createdAt ? new Date(at.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: at.updatedAt ? new Date(at.updatedAt).toISOString() : new Date().toISOString(),
      });
    }

    // Convert map to array
    let result = Array.from(taskItemsMap.values());

    // Apply Filters
    if (filters?.category && filters.category !== 'All') {
      result = result.filter((item) => item.category === filters.category);
    }
    if (filters?.status && filters.status !== 'All') {
      if (filters.status === 'Urgent / Expired') {
        result = result.filter((item) => !item.completed && (item.status === 'Expired' || item.priority === 'Urgent'));
      } else if (filters.status === 'Expiring Soon') {
        result = result.filter((item) => !item.completed && item.status === 'Expiring Soon');
      } else if (filters.status === 'Pending') {
        result = result.filter((item) => !item.completed && item.status !== 'Expired');
      } else if (filters.status === 'Completed') {
        result = result.filter((item) => item.completed);
      }
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    // Sort: Non-completed first sorted by urgency (Expired -> Urgent -> High -> Medium -> Low), completed at bottom
    const priorityWeight: Record<TaskPriority, number> = {
      Urgent: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.status === 'Expired' && b.status !== 'Expired') return -1;
      if (b.status === 'Expired' && a.status !== 'Expired') return 1;
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
    });

    return result;
  }

  /**
   * 3. Toggle Administrative Task Completion / Dismissal
   */
  static async toggleAdminTask(
    orgId: string,
    userId: string,
    dedupKey: string,
    completed: boolean
  ) {
    if (!dedupKey) {
      throw AppError.badRequest('dedupKey is required');
    }

    const orgObjId = mongoose.Types.ObjectId.isValid(orgId)
      ? new mongoose.Types.ObjectId(orgId)
      : new mongoose.Types.ObjectId('6ad9e23bf460aa2e6102c0c6');

    let userObjId: mongoose.Types.ObjectId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userObjId = new mongoose.Types.ObjectId(userId);
    } else {
      const u = await UserModel.findOne({
        $or: [
          { email: userId },
          { name: new RegExp(`^${String(userId).trim()}$`, 'i') },
        ],
      }).lean();
      userObjId = u ? (u._id as mongoose.Types.ObjectId) : new mongoose.Types.ObjectId('6ad9e23bf460aa2e6102c0c8');
    }

    // Check if manual to-do or generated dedupKey
    if (dedupKey.startsWith('manual:')) {
      const id = dedupKey.replace('manual:', '');
      const todo = await TodoModel.findById(id);
      if (todo) {
        todo.completed = completed;
        todo.completedAt = completed ? new Date() : null;
        todo.status = completed ? 'Completed' : 'Pending';
        await todo.save();
        return todo;
      }
    }

    // Upsert resolution state in TodoModel
    const updated = await TodoModel.findOneAndUpdate(
      { dedupKey },
      {
        orgId: orgObjId,
        userId: userObjId,
        title: `Resolution for ${dedupKey}`,
        completed,
        completedAt: completed ? new Date() : null,
        status: completed ? 'Completed' : 'Pending',
        dedupKey,
      },
      { upsert: true, new: true }
    );

    return updated;
  }

  /**
   * 4. Get Team Tasks (Admin view of delegated employee tasks)
   */
  static async getTeamTasks(
    _orgId: string,
    filters?: {
      employeeId?: string;
      clientId?: string;
      clientName?: string;
      status?: string;
      priority?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ tasks: ITeamTaskItem[]; total: number; totalPages: number }> {
    const todayYMD = getTodayKolkataYMD();
    const query: any = { isDeleted: false };

    if (filters?.employeeId && filters.employeeId !== 'All') {
      query.$or = [
        { assigneeId: filters.employeeId },
        { assigneeName: filters.employeeId },
      ];
    }

    if (filters?.clientId && filters.clientId !== 'All') {
      query.clientId = filters.clientId;
    }

    if (filters?.clientName && filters.clientName !== 'All') {
      query.clientName = new RegExp(`^${filters.clientName.trim()}$`, 'i');
    }

    if (filters?.priority && filters.priority !== 'All') {
      query.priority = filters.priority;
    }

    if (filters?.category && filters.category !== 'All') {
      query.category = filters.category;
    }

    if (filters?.status && filters.status !== 'All') {
      if (filters.status === 'Overdue') {
        query.status = { $nin: ['Completed', 'Cancelled'] };
        query.targetDueDate = { $lt: todayYMD };
      } else {
        query.status = filters.status;
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query.$or = [
        { taskName: { $regex: q, $options: 'i' } },
        { clientName: { $regex: q, $options: 'i' } },
        { taskId: { $regex: q, $options: 'i' } },
        { assigneeName: { $regex: q, $options: 'i' } },
      ];
    }

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, rawTasks] = await Promise.all([
      Task.countDocuments(query),
      Task.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const tasks: ITeamTaskItem[] = rawTasks.map((t: any) => {
      const dueYMD = resolveTaskDueDate(t);
      const daysLeft = dueYMD ? getDaysLeft(dueYMD, todayYMD) : 999;
      const isOverdue = t.status !== 'Completed' && t.status !== 'Cancelled' && Boolean(dueYMD && dueYMD < todayYMD);
      const chkTotal = t.checklist?.length || 0;
      const chkDone = t.checklist?.filter((c: any) => c.completed).length || 0;
      const progress = chkTotal > 0 ? Math.round((chkDone / chkTotal) * 100) : (t.progress || (t.status === 'Completed' ? 100 : 0));

      return {
        id: t._id.toString(),
        taskId: t.taskId,
        taskName: t.taskName || 'Untitled Task',
        description: t.description || '',
        clientName: t.clientName || 'General Client',
        clientId: t.clientId || '',
        category: t.category || 'General',
        department: t.department || 'General',
        assigneeId: t.assigneeId || '',
        assigneeName: t.assigneeName || 'Unassigned',
        assigneeInitials: t.assigneeInitials || (t.assigneeName ? t.assigneeName.slice(0, 2).toUpperCase() : 'UA'),
        assigneeColor: t.assigneeColor || '#3B82F6',
        priority: (t.priority as TaskPriority) || 'Medium',
        startDate: parseDateToYMD(t.startDate) || '',
        targetDueDate: dueYMD,
        endDate: parseDateToYMD(t.endDate) || '',
        status: t.status || 'Pending',
        progress,
        checklistTotal: chkTotal,
        checklistCompleted: chkDone,
        isOverdue,
        daysLeft,
        checklist: (t.checklist || []).map((c: any) => ({
          id: c.id || c._id?.toString(),
          title: c.title,
          completed: Boolean(c.completed),
          isMandatory: c.isMandatory !== false,
        })),
        comments: (t.comments || []).map((c: any) => ({
          id: c.id,
          author: c.author,
          text: c.text,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        })),
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    return {
      tasks,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 5. Get Employee Tasks (Strictly isolated to logged-in employee)
   */
  static async getEmployeeTasks(
    _orgId: string,
    user: { userId: string; name: string; role: string },
    filters?: {
      status?: string;
      priority?: string;
      search?: string;
    }
  ): Promise<ITeamTaskItem[]> {
    const todayYMD = getTodayKolkataYMD();

    const lookupQueries: any[] = [];
    if (user.userId) {
      if (mongoose.Types.ObjectId.isValid(user.userId)) {
        lookupQueries.push({ _id: user.userId });
      }
      lookupQueries.push({ userId: user.userId });
      lookupQueries.push({ email: user.userId });
      lookupQueries.push({ employeeId: user.userId });
      lookupQueries.push({ name: new RegExp(`^${String(user.userId).trim()}$`, 'i') });
    }
    if (user.name) {
      lookupQueries.push({ name: new RegExp(`^${String(user.name).trim()}$`, 'i') });
      lookupQueries.push({ email: user.name });
    }
    if ((user as any).email) {
      lookupQueries.push({ email: (user as any).email });
    }

    const userDoc = lookupQueries.length > 0
      ? await UserModel.findOne({ $or: lookupQueries }).lean()
      : null;

    const userConditions: any[] = [];
    if (user.userId) {
      userConditions.push({ assigneeId: user.userId });
      userConditions.push({ assigneeName: new RegExp(`^${String(user.userId).trim()}$`, 'i') });
    }
    if (user.name) {
      userConditions.push({ assigneeName: new RegExp(`^${String(user.name).trim()}$`, 'i') });
    }
    if ((user as any).email) {
      userConditions.push({ assigneeEmail: (user as any).email });
    }
    if (userDoc) {
      userConditions.push({ assigneeId: userDoc._id.toString() });
      if ((userDoc as any).employeeId) userConditions.push({ assigneeId: (userDoc as any).employeeId });
      if (userDoc.name) userConditions.push({ assigneeName: new RegExp(`^${userDoc.name.trim()}$`, 'i') });
      if (userDoc.email) userConditions.push({ assigneeEmail: userDoc.email });
    }
    if (user.name) {
      userConditions.push({ assigneeName: new RegExp(`^${user.name.trim()}$`, 'i') });
    }

    if (userConditions.length === 0) {
      return [];
    }

    const query: any = {
      isDeleted: false,
      $or: userConditions,
    };

    if (filters?.priority && filters.priority !== 'All') {
      query.priority = filters.priority;
    }

    if (filters?.status && filters.status !== 'All') {
      if (filters.status === 'Overdue') {
        query.status = { $nin: ['Completed', 'Cancelled'] };
        query.targetDueDate = { $lt: todayYMD };
      } else {
        query.status = filters.status;
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query.$and = [
        {
          $or: [
            { taskName: { $regex: q, $options: 'i' } },
            { clientName: { $regex: q, $options: 'i' } },
            { taskId: { $regex: q, $options: 'i' } },
          ],
        },
      ];
    }

    const rawTasks = await Task.find(query).sort({ targetDueDate: 1, updatedAt: -1 }).lean();

    const mappedTasks: ITeamTaskItem[] = rawTasks.map((t: any) => {
      const dueYMD = resolveTaskDueDate(t);
      const daysLeft = dueYMD ? getDaysLeft(dueYMD, todayYMD) : 999;
      const isOverdue = t.status !== 'Completed' && t.status !== 'Cancelled' && Boolean(dueYMD && dueYMD < todayYMD);
      const chkTotal = t.checklist?.length || 0;
      const chkDone = t.checklist?.filter((c: any) => c.completed).length || 0;
      const progress = chkTotal > 0 ? Math.round((chkDone / chkTotal) * 100) : (t.progress || (t.status === 'Completed' ? 100 : 0));

      return {
        id: t._id.toString(),
        taskId: t.taskId,
        taskName: t.taskName || 'Untitled Task',
        description: t.description || '',
        clientName: t.clientName || 'General Client',
        clientId: t.clientId || '',
        category: t.category || 'General',
        department: t.department || 'General',
        assigneeId: t.assigneeId || user.userId,
        assigneeName: t.assigneeName || user.name,
        assigneeInitials: t.assigneeInitials || (t.assigneeName ? t.assigneeName.slice(0, 2).toUpperCase() : user.name.slice(0, 2).toUpperCase()),
        assigneeColor: t.assigneeColor || '#3B82F6',
        priority: (t.priority as TaskPriority) || 'Medium',
        startDate: parseDateToYMD(t.startDate) || '',
        targetDueDate: dueYMD,
        endDate: parseDateToYMD(t.endDate) || '',
        status: t.status || 'Pending',
        progress,
        checklistTotal: chkTotal,
        checklistCompleted: chkDone,
        isOverdue,
        daysLeft,
        checklist: (t.checklist || []).map((c: any) => ({
          id: c.id || c._id?.toString(),
          title: c.title,
          completed: Boolean(c.completed),
          isMandatory: c.isMandatory !== false,
        })),
        comments: (t.comments || []).map((c: any) => ({
          id: c.id,
          author: c.author,
          text: c.text,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        })),
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    // Also fetch personal to-dos created by this employee in TodoModel
    const todoOrConditions: any[] = [];
    if (mongoose.Types.ObjectId.isValid(user.userId)) {
      todoOrConditions.push({ userId: user.userId });
    }
    if (userDoc && userDoc._id) {
      todoOrConditions.push({ userId: userDoc._id });
    }

    let personalTodos: any[] = [];
    if (todoOrConditions.length > 0) {
      const personalQuery: any = {
        $or: todoOrConditions,
        sourceType: { $ne: 'admin_resolution' },
      };

      if (filters?.priority && filters.priority !== 'All') {
        personalQuery.priority = filters.priority;
      }

      if (filters?.status && filters.status !== 'All') {
        if (filters.status === 'Completed') {
          personalQuery.completed = true;
        } else if (filters.status === 'Overdue') {
          personalQuery.completed = false;
          personalQuery.dueDate = { $lt: todayYMD };
        } else {
          personalQuery.completed = false;
        }
      }

      if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim();
        personalQuery.$and = [
          {
            $or: [
              { title: { $regex: q, $options: 'i' } },
              { clientName: { $regex: q, $options: 'i' } },
              { description: { $regex: q, $options: 'i' } },
            ],
          },
        ];
      }

      personalTodos = await TodoModel.find(personalQuery).sort({ createdAt: -1 }).lean();
    }

    const personalItems: ITeamTaskItem[] = personalTodos.map((pt: any) => {
      const pDueYMD = parseDateToYMD(pt.dueDate) || todayYMD;
      const pDaysLeft = getDaysLeft(pDueYMD, todayYMD);
      const isDone = Boolean(pt.completed);
      const isOverdue = !isDone && pDaysLeft < 0;

      return {
        id: pt._id.toString(),
        taskId: `TD-${pt._id.toString().slice(-5).toUpperCase()}`,
        taskName: pt.title,
        description: pt.description || '',
        clientName: pt.clientName || 'Personal',
        clientId: pt.clientId || '',
        category: pt.category || 'Personal',
        department: pt.category || 'Personal',
        assigneeId: user.userId,
        assigneeName: user.name || 'Employee',
        assigneeInitials: user.name ? user.name.slice(0, 2).toUpperCase() : 'ME',
        assigneeColor: '#6366F1',
        priority: (pt.priority as TaskPriority) || 'Medium',
        startDate: parseDateToYMD(pt.createdAt) || todayYMD,
        targetDueDate: pDueYMD,
        endDate: '',
        status: isDone ? 'Completed' : isOverdue ? 'Overdue' : 'Pending',
        progress: isDone ? 100 : 0,
        checklistTotal: 1,
        checklistCompleted: isDone ? 1 : 0,
        isOverdue,
        daysLeft: pDaysLeft,
        checklist: [
          {
            id: `chk_${pt._id.toString()}`,
            title: pt.title,
            completed: isDone,
            isMandatory: true,
          },
        ],
        comments: [],
        createdAt: pt.createdAt ? new Date(pt.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: pt.updatedAt ? new Date(pt.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    const allItems = [...mappedTasks, ...personalItems];
    allItems.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return (a.targetDueDate || '').localeCompare(b.targetDueDate || '');
    });

    return allItems;
  }

  /**
   * 6. Admin assigns a task to an employee
   */
  static async assignTask(
    orgId: string,
    creatorUser: { userId: string; name: string; role: string },
    data: {
      title?: string;
      taskName?: string;
      description?: string;
      category?: string;
      clientId?: string;
      clientName?: string;
      assigneeId: string;
      assigneeName?: string;
      priority?: TaskPriority;
      startDate?: string;
      dueDate?: string;
      targetDueDate?: string;
      checklist?: Array<{ title: string; isMandatory?: boolean }>;
    }
  ) {
    if (!isAdminRole(creatorUser.role)) {
      throw AppError.forbidden('Only administrators and managers are authorized to delegate tasks.');
    }

    const resolvedTitle = (data.title || data.taskName || '').trim();
    if (!resolvedTitle) {
      throw AppError.badRequest('Task title is required.');
    }

    if (!data.assigneeId) {
      throw AppError.badRequest('An employee assignment is required.');
    }

    const resolvedDueDate = (data.dueDate || data.targetDueDate || '').trim();
    if (!resolvedDueDate) {
      throw AppError.badRequest('A due date is required.');
    }

    // Verify employee exists and is active
    let employee: any = null;
    if (mongoose.Types.ObjectId.isValid(data.assigneeId)) {
      employee = await UserModel.findById(data.assigneeId).lean();
    }
    if (!employee) {
      employee = await UserModel.findOne({
        $or: [{ name: data.assigneeId }, { email: data.assigneeId }],
      }).lean();
    }
    if (!employee || (employee.status as string) === 'deactivated' || (employee.status as string) === 'resigned' || (employee.status as string) === 'suspended') {
      throw AppError.badRequest('Selected employee is invalid or inactive.');
    }

    // Get client details if provided
    let clientName = data.clientName || 'General Client';
    let clientFileNo = '';
    let clientPan = '-';

    if (data.clientId && mongoose.Types.ObjectId.isValid(data.clientId)) {
      const client = await Client.findById(data.clientId).lean();
      if (client) {
        clientName = client.name || client.legalName || clientName;
        clientFileNo = client.fileNo || '';
        clientPan = client.pan || '-';
      }
    }

    // In-memory concurrent lock to prevent race-condition duplicates on rapid clicks
    const lockKey = `${employee._id.toString()}:${resolvedTitle}:${parseDateToYMD(resolvedDueDate)}`;
    if ((TodoService as any).ongoingAssignTaskLocks?.has(lockKey)) {
      logger.info(`Concurrent assignTask in progress for ${lockKey}, reusing in-flight promise`);
      return await (TodoService as any).ongoingAssignTaskLocks.get(lockKey);
    }

    if (!(TodoService as any).ongoingAssignTaskLocks) {
      (TodoService as any).ongoingAssignTaskLocks = new Map<string, Promise<any>>();
    }

    const taskExecutionPromise = (async () => {
      // Check for double-click / rapid submission within 10 seconds
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const existingRecent = await Task.findOne({
        taskName: resolvedTitle,
        assigneeId: employee._id.toString(),
        targetDueDate: parseDateToYMD(resolvedDueDate),
        createdAt: { $gte: tenSecondsAgo },
      }).lean();
      if (existingRecent) {
        logger.info(`Idempotent assignTask: reusing task ${existingRecent.taskId} created within 10s`);
        return existingRecent;
      }

      // Generate unique Task ID using dedicated CounterService
      const nextSeq = await CounterService.getNextSequence('taskIdCounter_2026');
      const taskId = `#TSK${String(nextSeq).padStart(5, '0')}`;

      const formattedChecklist = (data.checklist || []).map((st, idx) => ({
        id: `chk_${Date.now()}_${idx + 1}`,
        title: st.title.trim(),
        completed: false,
        isMandatory: st.isMandatory !== false,
      }));

      const newTask = await Task.create({
        taskId,
        taskName: resolvedTitle,
        description: data.description?.trim() || '',
        category: data.category || 'General',
        department: data.category || 'General',
        serviceName: data.category ? `${data.category} Service` : 'Compliance Review',
        clientId: data.clientId || null,
        clientName,
        clientFileNo,
        clientPan,
        assigneeId: employee._id.toString(),
        assigneeName: employee.name,
        assigneeInitials: employee.initials || employee.name.slice(0, 2).toUpperCase(),
        assigneeColor: '#3B82F6',
        priority: data.priority || 'Medium',
        startDate: parseDateToYMD(data.startDate) || getTodayKolkataYMD(),
        targetDueDate: parseDateToYMD(resolvedDueDate) || getTodayKolkataYMD(),
        status: 'Pending',
        progress: 0,
        checklist: formattedChecklist,
        comments: [
          {
            id: `cmt_${Date.now()}`,
            author: creatorUser.name || 'Admin',
            authorInitials: 'AD',
            avatarColor: '#3B82F6',
            text: `Task delegated to ${employee.name} by ${creatorUser.name || 'Admin'} with deadline ${data.dueDate}.`,
            createdAt: new Date(),
          },
        ],
        creatorName: creatorUser.name || 'Admin',
        orgId,
        userId: creatorUser.userId,
        createdBy: creatorUser.name,
      });

      logger.info(`✅ To-Do Task created and assigned: ${taskId} to ${employee.name}`);
      return newTask;
    })();

    (TodoService as any).ongoingAssignTaskLocks.set(lockKey, taskExecutionPromise);
    try {
      return await taskExecutionPromise;
    } finally {
      setTimeout(() => {
        (TodoService as any).ongoingAssignTaskLocks?.delete(lockKey);
      }, 10000);
    }
  }

  /**
   * 7. Update Task Progress & Status (Employee & Admin)
   * Supports checklist toggling, progress percentage (0-100), status workflow, and progress notes.
   */
  static async updateTaskProgress(
    _orgId: string,
    user: { userId: string; name: string; role: string },
    taskId: string,
    data: {
      status?: string;
      progress?: number;
      toggleChecklistId?: string;
      checklistCompleted?: boolean;
      note?: string;
      reassignEmployeeId?: string;
      targetDueDate?: string;
    }
  ) {
    const task = await Task.findOne({
      $or: [{ taskId }, { _id: mongoose.Types.ObjectId.isValid(taskId) ? new mongoose.Types.ObjectId(taskId) : null }],
      isDeleted: false,
    });

    if (!task) {
      // Check if taskId belongs to a personal To-Do or admin responsibility resolution
      if (mongoose.Types.ObjectId.isValid(taskId)) {
        const todo = await TodoModel.findById(taskId);
        if (todo) {
          const isDone = data.status === 'Completed' || data.checklistCompleted === true || (data.progress !== undefined && data.progress >= 100);
          todo.completed = isDone;
          todo.status = isDone ? 'Completed' : 'Pending';
          todo.completedAt = isDone ? new Date() : null;
          await todo.save();
          return todo;
        }
      }

      // Check if taskId is a dedupKey (starts with admin: or manual:)
      if (taskId.startsWith('admin:') || taskId.startsWith('manual:')) {
        const isDone = data.status === 'Completed' || data.checklistCompleted === true || (data.progress !== undefined && data.progress >= 100);
        return await this.toggleAdminTask(_orgId, user.userId, taskId, isDone);
      }

      throw AppError.notFound(`Task "${taskId}" not found.`);
    }

    const isAdmin = isAdminRole(user.role);

    // If non-admin employee, strictly enforce that task is assigned to them
    if (!isAdmin) {
      const isAssigned =
        task.assigneeId === user.userId ||
        task.assigneeName?.toLowerCase().trim() === user.name?.toLowerCase().trim();

      if (!isAssigned) {
        throw AppError.forbidden('Access denied. You can only update tasks assigned directly to you.');
      }

      // Employees cannot reassign tasks to other people
      if (data.reassignEmployeeId && data.reassignEmployeeId !== task.assigneeId) {
        throw AppError.forbidden('Employees are not authorized to reassign tasks.');
      }
    } else {
      // Admin reassigning task
      if (data.reassignEmployeeId) {
        const emp = await UserModel.findById(data.reassignEmployeeId).lean();
        if (emp && (emp.status as string) !== 'deactivated' && (emp.status as string) !== 'resigned') {
          const oldAssignee = task.assigneeName;
          task.assigneeId = emp._id.toString();
          task.assigneeName = emp.name;
          task.assigneeInitials = emp.initials || emp.name.slice(0, 2).toUpperCase();
          task.comments.push({
            id: `cmt_${Date.now()}`,
            author: user.name,
            authorInitials: 'AD',
            avatarColor: '#3B82F6',
            text: `Reassigned task from ${oldAssignee} to ${emp.name} by ${user.name}.`,
            createdAt: new Date(),
          } as any);
        }
      }

      // Admin updating due date
      if (data.targetDueDate) {
        const parsedDue = parseDateToYMD(data.targetDueDate);
        if (parsedDue) {
          task.targetDueDate = parsedDue;
        }
      }
    }

    // Toggle or update checklist item
    if (data.toggleChecklistId) {
      const item = task.checklist.find(
        (c: any) => c.id === data.toggleChecklistId || (c as any)._id?.toString() === data.toggleChecklistId
      );
      if (item) {
        item.completed = data.checklistCompleted !== undefined ? data.checklistCompleted : !item.completed;
        task.markModified('checklist');
      }
    }

    // Compute checklist progress
    const chkTotal = task.checklist?.length || 0;
    const chkDone = task.checklist?.filter((c: any) => c.completed).length || 0;

    if (chkTotal > 0) {
      task.progress = Math.round((chkDone / chkTotal) * 100);
    } else if (data.progress !== undefined) {
      const p = Math.max(0, Math.min(100, Math.round(data.progress)));
      task.progress = p;
    }

    // Handle Status Update
    if (data.status) {
      const validStatuses = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Sent for Review', 'Cancelled'];
      if (!validStatuses.includes(data.status)) {
        throw AppError.badRequest(`Invalid status "${data.status}". Supported: ${validStatuses.join(', ')}`);
      }

      if (data.status === 'Completed') {
        // Validation: Cannot mark completed if mandatory checklist items are not done!
        if (chkTotal > 0) {
          const pendingMandatory = task.checklist.filter((c: any) => c.isMandatory !== false && !c.completed);
          if (pendingMandatory.length > 0) {
            throw AppError.badRequest(
              `Cannot mark task as Completed: ${pendingMandatory.length} mandatory checklist item(s) are still pending.`
            );
          }
          // Mark all checklist items completed and progress to 100%
          task.checklist.forEach((c: any) => {
            c.completed = true;
          });
          task.markModified('checklist');
          task.progress = 100;
        } else if (data.progress !== undefined && data.progress < 100) {
          throw AppError.badRequest('Cannot mark task as Completed with progress less than 100%.');
        } else {
          task.progress = 100;
        }
      }

      task.status = data.status as any;
    }

    // Add progress comment note if provided
    if (data.note && data.note.trim()) {
      task.comments.push({
        id: `cmt_${Date.now()}`,
        author: user.name,
        authorInitials: user.name ? user.name.slice(0, 2).toUpperCase() : 'U',
        avatarColor: '#10B981',
        text: data.note.trim(),
        createdAt: new Date(),
      } as any);
      task.markModified('comments');
    }

    await task.save();
    return task;
  }

  /**
   * 8. Get Calendar Events for To-Do Module
   * Reuses the calendar structure of the Notices section with canonical 1-to-1 event mapping,
   * Admin personal + team aggregation with employee filtering, and strict employee-only query isolation.
   */
  static async getCalendarEvents(
    orgId: string,
    user: { userId: string; name: string; role: string },
    monthStr?: string, // e.g. "2026-11"
    employeeIdFilter?: string
  ): Promise<ITodoCalendarEvent[]> {
    const todayYMD = getTodayKolkataYMD();
    const currentMonthPrefix = monthStr || todayYMD.slice(0, 7);
    const isAdmin = isAdminRole(user.role);
    const eventMap = new Map<string, ITodoCalendarEvent>();

    if (isAdmin) {
      // 1. Admin's Personal To-Dos from TodoModel (if no employee filter, or if employee filter matches admin)
      if (!employeeIdFilter || employeeIdFilter === 'All' || employeeIdFilter === user.userId || employeeIdFilter === user.name) {
        const userObjId = mongoose.Types.ObjectId.isValid(user.userId)
          ? new mongoose.Types.ObjectId(user.userId)
          : null;

        const personalTodos = await TodoModel.find({
          $or: [
            ...(userObjId ? [{ userId: userObjId }] : []),
            { sourceType: 'manual' },
          ],
        }).lean();

        for (const pt of personalTodos) {
          const dueYMD = parseDateToYMD(pt.dueDate);
          if (dueYMD && dueYMD.startsWith(currentMonthPrefix)) {
            const idKey = `todo:${pt._id.toString()}`;
            if (!eventMap.has(idKey)) {
              eventMap.set(idKey, {
                id: idKey,
                date: dueYMD,
                title: pt.title,
                clientName: pt.clientName || 'Personal',
                category: pt.category || 'Personal',
                type: 'personal_todo',
                priority: (pt.priority as TaskPriority) || 'Medium',
                status: pt.completed ? 'Completed' : dueYMD < todayYMD ? 'Expired' : 'Pending',
                isOverdue: !pt.completed && dueYMD < todayYMD,
                isCompleted: Boolean(pt.completed),
                isPersonal: true,
                assigneeName: user.name || 'Admin',
                assigneeInitials: 'AD',
                assigneeColor: '#6366F1',
                actionUrl: '/to-do',
              });
            }
          }
        }

        // 2. Administrative Task Deadlines (Compliance, Review, DSC/License)
        const adminTasks = await this.getAdminTasks(orgId, user.userId);
        for (const at of adminTasks) {
          if (at.dueDate && at.dueDate.startsWith(currentMonthPrefix)) {
            const adminKey = `admin:${at.dedupKey}`;
            if (!eventMap.has(adminKey)) {
              eventMap.set(adminKey, {
                id: adminKey,
                date: at.dueDate,
                title: at.title,
                clientName: at.clientName,
                category: at.category,
                type: 'admin_deadline',
                priority: at.priority,
                status: at.status,
                isOverdue: !at.completed && at.dueDate < todayYMD,
                isCompleted: at.completed,
                isPersonal: true,
                actionUrl: at.actionUrl,
              });
            }
          }
        }
      }

      // 3. Team Tasks (assigned to employees or self)
      const taskQuery: any = { isDeleted: false };
      if (employeeIdFilter && employeeIdFilter !== 'All') {
        taskQuery.$or = [
          { assigneeId: employeeIdFilter },
          { assigneeName: employeeIdFilter },
        ];
      }

      const teamTasks = await Task.find(taskQuery)
        .select('taskId taskName clientName category priority status targetDueDate startDate assigneeName assigneeInitials assigneeColor assigneeId')
        .lean();

      for (const t of teamTasks) {
        // CANONICAL DEADLINE: resolveTaskDueDate across targetDueDate, complianceStatus, startDate
        const canonicalDate = resolveTaskDueDate(t);
        const isDone = t.status === 'Completed';

        if (canonicalDate && canonicalDate.startsWith(currentMonthPrefix)) {
          const taskKey = `task:${t.taskId || (t as any)._id?.toString()}`;
          // Set once and only once - deduplicated!
          if (!eventMap.has(taskKey)) {
            eventMap.set(taskKey, {
              id: taskKey,
              date: canonicalDate,
              title: t.taskName,
              clientName: t.clientName || 'General Client',
              category: t.category || 'General',
              type: 'task_due',
              priority: (t.priority as TaskPriority) || 'Medium',
              status: t.status,
              isOverdue: !isDone && canonicalDate < todayYMD,
              isCompleted: isDone,
              taskId: t.taskId,
              assigneeName: t.assigneeName,
              assigneeInitials: t.assigneeInitials,
              assigneeColor: t.assigneeColor,
              assigneeId: t.assigneeId,
              isPersonal: false,
              actionUrl: `/task/view/${t.taskId}`,
            });
          }
        }
      }
    } else {
      // Normal Employee Calendar View: STRICTLY only employee's tasks and employee's personal to-dos
      const userDoc = mongoose.Types.ObjectId.isValid(user.userId)
        ? await UserModel.findById(user.userId).lean()
        : await UserModel.findOne({
            $or: [
              { email: user.name },
              { name: new RegExp(`^${user.name.trim()}$`, 'i') },
            ],
          }).lean();

      const userConditions: any[] = [];
      if (user.userId) userConditions.push({ assigneeId: user.userId });
      if (userDoc) {
        userConditions.push({ assigneeId: userDoc._id.toString() });
        if ((userDoc as any).employeeId) userConditions.push({ assigneeId: (userDoc as any).employeeId });
        if (userDoc.name) userConditions.push({ assigneeName: new RegExp(`^${userDoc.name.trim()}$`, 'i') });
        if (userDoc.email) userConditions.push({ assigneeEmail: userDoc.email });
      }
      if (user.name) userConditions.push({ assigneeName: new RegExp(`^${user.name.trim()}$`, 'i') });

      const empTasks = await Task.find({
        isDeleted: false,
        $or: userConditions,
      })
        .select('taskId taskName clientName category priority status targetDueDate complianceStatus dueDate startDate assigneeName assigneeInitials assigneeColor assigneeId')
        .lean();

      for (const t of empTasks) {
        const canonicalDate = resolveTaskDueDate(t);
        const isDone = t.status === 'Completed';

        if (canonicalDate && canonicalDate.startsWith(currentMonthPrefix)) {
          const taskKey = `task:${t.taskId || (t as any)._id?.toString()}`;
          if (!eventMap.has(taskKey)) {
            eventMap.set(taskKey, {
              id: taskKey,
              date: canonicalDate,
              title: t.taskName,
              clientName: t.clientName || 'General Client',
              category: t.category || 'General',
              type: 'task_due',
              priority: (t.priority as TaskPriority) || 'Medium',
              status: t.status,
              isOverdue: !isDone && canonicalDate < todayYMD,
              isCompleted: isDone,
              taskId: t.taskId,
              assigneeName: t.assigneeName,
              assigneeInitials: t.assigneeInitials,
              assigneeColor: t.assigneeColor,
              assigneeId: t.assigneeId,
              isPersonal: false,
              actionUrl: `/task/view/${t.taskId}`,
            });
          }
        }
      }

      // Plus employee's personal to-dos
      const userObjId = mongoose.Types.ObjectId.isValid(user.userId)
        ? new mongoose.Types.ObjectId(user.userId)
        : null;

      const personalTodos = await TodoModel.find({
        $or: [
          ...(userObjId ? [{ userId: userObjId }] : []),
          { userId: user.userId },
          ...(userDoc ? [{ userId: userDoc._id }] : []),
        ],
        sourceType: { $ne: 'admin_resolution' },
      }).lean();

      for (const pt of personalTodos) {
        const dueYMD = parseDateToYMD(pt.dueDate) || todayYMD;
        if (dueYMD && dueYMD.startsWith(currentMonthPrefix)) {
          const idKey = `todo:${pt._id.toString()}`;
          if (!eventMap.has(idKey)) {
            eventMap.set(idKey, {
              id: idKey,
              date: dueYMD,
              title: pt.title,
              clientName: pt.clientName || 'Personal',
              category: pt.category || 'Personal',
              type: 'personal_todo',
              priority: (pt.priority as TaskPriority) || 'Medium',
              status: pt.completed ? 'Completed' : dueYMD < todayYMD ? 'Expired' : 'Pending',
              isOverdue: !pt.completed && dueYMD < todayYMD,
              isCompleted: Boolean(pt.completed),
              isPersonal: true,
              assigneeName: user.name,
              assigneeInitials: user.name.slice(0, 2).toUpperCase(),
              assigneeColor: '#6366F1',
              actionUrl: '/to-do',
            });
          }
        }
      }
    }

    return Array.from(eventMap.values());
  }

  // --- Retain existing legacy personal to-dos for AdminWelcomeTodoCard compatibility ---
  static async listUserTodos(orgId: string, userId: string) {
    let userObjId: mongoose.Types.ObjectId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userObjId = new mongoose.Types.ObjectId(userId);
    } else {
      const u = await UserModel.findOne({
        $or: [
          { email: userId },
          { name: new RegExp(`^${String(userId).trim()}$`, 'i') },
        ],
      }).lean();
      userObjId = u ? (u._id as mongoose.Types.ObjectId) : new mongoose.Types.ObjectId('6ad9e23bf460aa2e6102c0c8');
    }
    const orgObjId = mongoose.Types.ObjectId.isValid(orgId)
      ? new mongoose.Types.ObjectId(orgId)
      : new mongoose.Types.ObjectId('6ad9e23bf460aa2e6102c0c6');

    const items = await TodoModel.find({
      userId: userObjId,
      orgId: orgObjId,
      sourceType: { $in: ['manual', undefined, null] },
    })
      .sort({ completed: 1, dueDate: 1, createdAt: -1 })
      .lean();

    return items.map((item) => ({
      id: String(item._id),
      title: item.title,
      description: item.description || '',
      category: item.category || 'General',
      priority: item.priority || 'Medium',
      clientName: item.clientName || '',
      clientId: item.clientId || null,
      completed: item.completed,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
      dueDate: item.dueDate || null,
      createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
    }));
  }

  static async createTodo(
    orgId: string,
    userId: string,
    data: {
      title: string;
      dueDate?: string | null;
      description?: string;
      priority?: TaskPriority;
      category?: string;
      clientName?: string;
      clientId?: string;
    }
  ) {
    if (!data.title || !data.title.trim()) {
      throw AppError.badRequest('Title is required');
    }

    const orgObjId = mongoose.Types.ObjectId.isValid(orgId)
      ? new mongoose.Types.ObjectId(orgId)
      : new mongoose.Types.ObjectId('6ad9e23bf460aa2e6102c0c6');

    let userObjId: mongoose.Types.ObjectId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userObjId = new mongoose.Types.ObjectId(userId);
    } else {
      const u = await UserModel.findOne({
        $or: [
          { email: userId },
          { name: new RegExp(`^${String(userId).trim()}$`, 'i') },
        ],
      }).lean();
      userObjId = u ? (u._id as mongoose.Types.ObjectId) : new mongoose.Types.ObjectId('6ad9e23bf460aa2e6102c0c8');
    }

    // Check for double-click / rapid submission within 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const existingRecent = await TodoModel.findOne({
      userId: userObjId,
      title: data.title.trim(),
      dueDate: data.dueDate?.trim() || null,
      createdAt: { $gte: tenSecondsAgo },
    }).lean();
    if (existingRecent) {
      logger.info(`Idempotent createTodo: reusing todo ${existingRecent._id} created within 10s`);
      return {
        id: String(existingRecent._id),
        title: existingRecent.title,
        description: existingRecent.description,
        priority: existingRecent.priority,
        category: existingRecent.category,
        clientName: existingRecent.clientName,
        completed: existingRecent.completed,
        completedAt: existingRecent.completedAt ? existingRecent.completedAt.toISOString() : null,
        dueDate: existingRecent.dueDate || null,
        createdAt: existingRecent.createdAt.toISOString(),
        updatedAt: existingRecent.updatedAt.toISOString(),
      };
    }

    const todo = await TodoModel.create({
      orgId: orgObjId,
      userId: userObjId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      priority: data.priority || 'Medium',
      category: data.category || 'General',
      clientName: data.clientName?.trim() || 'Internal Firm',
      clientId: data.clientId || undefined,
      dueDate: data.dueDate?.trim() || null,
      completed: false,
      sourceType: 'manual',
    });

    return {
      id: String(todo._id),
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      category: todo.category,
      clientName: todo.clientName,
      completed: todo.completed,
      completedAt: null,
      dueDate: todo.dueDate || null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  static async updateTodo(
    _orgId: string,
    _userId: string,
    todoId: string,
    updates: {
      title?: string;
      completed?: boolean;
      dueDate?: string | null;
      description?: string;
      priority?: TaskPriority;
      category?: string;
    }
  ) {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      throw AppError.badRequest('Invalid todo ID');
    }

    const todo = await TodoModel.findById(todoId);
    if (!todo) {
      throw AppError.notFound('To-Do item not found');
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
      todo.title = updates.title.trim();
    }
    if (typeof updates.description === 'string') {
      todo.description = updates.description.trim();
    }
    if (updates.priority) {
      todo.priority = updates.priority;
    }
    if (updates.category) {
      todo.category = updates.category;
    }
    if (typeof updates.completed === 'boolean') {
      todo.completed = updates.completed;
      todo.completedAt = updates.completed ? new Date() : null;
      todo.status = updates.completed ? 'Completed' : 'Pending';
    }
    if (updates.dueDate !== undefined) {
      todo.dueDate = updates.dueDate ? updates.dueDate.trim() : null;
    }

    await todo.save();

    return {
      id: String(todo._id),
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      category: todo.category,
      completed: todo.completed,
      completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
      dueDate: todo.dueDate || null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  static async deleteTodo(_orgId: string, _userId: string, todoId: string) {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      throw AppError.badRequest('Invalid todo ID');
    }
    await TodoModel.findByIdAndDelete(todoId);
    return { id: todoId };
  }
}
