import mongoose from 'mongoose';
import { Task } from './task.model';
import { Service } from '../service/service.model';
import {
  ITask,
  ITaskDocument,
  ITaskSummaryRow,
  ITaskStats,
  ILinkedEmail,
} from './task.interface';
import { QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';



import { DriveService } from '../drive/drive.service';
import { DocumentCategory } from '../drive/drive.interface';
import { CounterService } from '../counter/counter.service';

export class TaskService {
  /**
   * Auto seed initial tasks if collection is empty (disabled: real data only)
   */
  static async seedInitialTasksIfNeeded(): Promise<void> {
    // Strictly real data from database; no dummy task seeding
  }

  /**
   * Retrieve all tasks with rich filtering, search and pagination
   */
  static async getAllTasks(queryOptions: QueryOptions & {
    category?: string;
    quickFilter?: string;
    status?: string;
    assigneeName?: string;
    department?: string;
    financialYear?: string;
    period?: string;
    clientId?: string;
    clientFileNo?: string;
    clientName?: string;
  }, userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null): Promise<{ items: ITaskDocument[]; pagination: PaginationMeta }> {
    await this.seedInitialTasksIfNeeded();

    const filter: Record<string, any> = { isDeleted: false };
    const andClauses: any[] = [];

    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;
    const userName = typeof userCtx === 'object' ? userCtx?.name : undefined;

    // Org and user data isolation filter
    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (userId) {
        orgConditions.push(
          { userId },
          { createdBy: userId },
          { adminId: userId },
          { assigneeId: userId },
          { reviewerId: userId }
        );
      }
      andClauses.push({ $or: orgConditions });
    } else if (userId) {
      const userConditions: any[] = [
        { userId },
        { createdBy: userId },
        { adminId: userId },
        { assigneeId: userId },
        { reviewerId: userId },
      ];

      if (userName && userName.trim()) {
        const nameRegex = new RegExp(`^${userName.trim()}$`, 'i');
        userConditions.push(
          { assigneeName: nameRegex },
          { reviewerName: nameRegex },
          { creatorName: nameRegex }
        );
      }

      andClauses.push({ $or: userConditions });
    }

    // Client filter (supports clientId, clientFileNo, or clientName)
    if (queryOptions.clientId) {
      let clientFileNo = queryOptions.clientFileNo;
      let clientName = queryOptions.clientName;

      if (mongoose.Types.ObjectId.isValid(queryOptions.clientId)) {
        try {
          const cl = await mongoose.model('Client').findById(queryOptions.clientId).select('name fileNo').lean() as any;
          if (cl) {
            clientFileNo = clientFileNo || cl.fileNo;
            clientName = clientName || cl.name;
          }
        } catch {
          // ignore
        }
      }

      const clientConditions: any[] = [
        { clientId: queryOptions.clientId },
      ];
      if (clientFileNo) {
        clientConditions.push({ clientFileNo });
      }
      if (clientName) {
        clientConditions.push({ clientName: new RegExp(`^${clientName.trim()}$`, 'i') });
      }
      andClauses.push({ $or: clientConditions });
    } else if (queryOptions.clientFileNo || queryOptions.clientName) {
      const clientConditions: any[] = [];
      if (queryOptions.clientFileNo) {
        clientConditions.push({ clientFileNo: queryOptions.clientFileNo });
      }
      if (queryOptions.clientName) {
        clientConditions.push({ clientName: new RegExp(`^${queryOptions.clientName.trim()}$`, 'i') });
      }
      andClauses.push({ $or: clientConditions });
    }

    // Category filter
    if (queryOptions.category && queryOptions.category !== 'All Categories') {
      filter.category = queryOptions.category;
    }

    // Status filter
    if (queryOptions.status) {
      if (queryOptions.status === 'WIP') {
        filter.status = { $in: ['Pending', 'In Progress', 'Sent for Review', 'Request Changes'] };
      } else {
        filter.status = queryOptions.status;
      }
    }

    // Quick filters
    if (queryOptions.quickFilter) {
      if (queryOptions.quickFilter === 'My Tasks') {
        const myOr: any[] = [];
        if (userId) {
          myOr.push({ assigneeId: userId });
        }
        if (userName) {
          myOr.push({ assigneeName: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }
        if (myOr.length > 0) {
          andClauses.push({ $or: myOr });
        }
      } else if (queryOptions.quickFilter === 'Due Today') {
        filter.targetDueDate = '27/07/2026';
      } else if (queryOptions.quickFilter === 'Live Task') {
        filter.status = { $in: ['Pending', 'In Progress', 'Sent for Review'] };
      }
    }

    // Assignee filter
    if (queryOptions.assigneeName && queryOptions.assigneeName !== 'All Assignees') {
      filter.assigneeName = queryOptions.assigneeName;
    }

    // Department filter
    if (queryOptions.department && queryOptions.department !== 'All Dept') {
      filter.department = queryOptions.department;
    }

    // Period filter
    if (queryOptions.period && queryOptions.period !== 'All Period') {
      filter.period = queryOptions.period;
    }

    // Financial Year filter
    if (queryOptions.financialYear) {
      filter.financialYear = queryOptions.financialYear;
    }

    // Full text search
    if (queryOptions.search?.trim()) {
      const s = queryOptions.search.trim();
      andClauses.push({
        $or: [
          { taskId: { $regex: s, $options: 'i' } },
          { taskName: { $regex: s, $options: 'i' } },
          { clientName: { $regex: s, $options: 'i' } },
          { clientFileNo: { $regex: s, $options: 'i' } },
          { clientPan: { $regex: s, $options: 'i' } },
          { legalName: { $regex: s, $options: 'i' } },
          { serviceName: { $regex: s, $options: 'i' } },
          { assigneeName: { $regex: s, $options: 'i' } },
          { category: { $regex: s, $options: 'i' } },
          { status: { $regex: s, $options: 'i' } },
        ],
      });
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    const pageNum = Number(queryOptions.page) || 1;
    const limitNum = Number(queryOptions.limit) || 50;
    const page = Math.max(1, pageNum);
    const limit = Math.max(1, Math.min(200, limitNum));
    const skip = (page - 1) * limit;

    const sortField = queryOptions.sortBy || 'createdAt';
    const sortDirection = queryOptions.sortOrder === 'asc' ? 1 : -1;

    const [items, totalItems] = await Promise.all([
      Task.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    const pagination: PaginationMeta = {
      page,
      limit,
      totalDocs: totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { items: items as any, pagination };
  }

  /**
   * Retrieve Task KPI Stats (10 cards from screenshot)
   */
  static async getTaskStats(
    category?: string,
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<ITaskStats> {
    await this.seedInitialTasksIfNeeded();

    const matchFilter: Record<string, any> = { isDeleted: false };
    if (category && category !== 'All Categories') {
      matchFilter.category = category;
    }
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;

    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (userId) {
        orgConditions.push(
          { userId },
          { createdBy: userId },
          { adminId: userId },
          { assigneeId: userId },
          { reviewerId: userId }
        );
      }
      matchFilter.$or = orgConditions;
    } else if (userId) {
      const userConditions: any[] = [
        { userId },
        { createdBy: userId },
        { adminId: userId },
        { assigneeId: userId },
        { reviewerId: userId },
      ];

      matchFilter.$or = userConditions;
    }

    const tasks = await Task.find(matchFilter).lean();

    const counts: ITaskStats = {
      wip: 0,
      pending: 0,
      inProgress: 0,
      sentForReview: 0,
      requestChanges: 0,
      overdue: 0,
      completed: 0,
      readyToBill: 0,
      cancelled: 0,
      allTasks: tasks.length,
    };

    for (const t of tasks) {
      if (t.status === 'Pending') counts.pending++;
      else if (t.status === 'In Progress') counts.inProgress++;
      else if (t.status === 'Sent for Review') counts.sentForReview++;
      else if (t.status === 'Request Changes') counts.requestChanges++;
      else if (t.status === 'Overdue') counts.overdue++;
      else if (t.status === 'Completed') counts.completed++;
      else if (t.status === 'Ready to Bill') counts.readyToBill++;
      else if (t.status === 'Cancelled') counts.cancelled++;

      if (['Pending', 'In Progress', 'Sent for Review', 'Request Changes'].includes(t.status)) {
        counts.wip++;
      }
    }

    return counts;
  }

  /**
   * Retrieve Task Summary Pivot / Matrix
   * Supports group by: Assigned To, Category, Client, Service, Priority, Task Type, Month, Financial Year
   */
  static async getTaskSummaryMatrix(
    groupBy: string = 'Assigned To',
    search?: string,
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{ rows: ITaskSummaryRow[]; grandTotal: ITaskSummaryRow }> {
    await this.seedInitialTasksIfNeeded();

    const matchFilter: Record<string, any> = { isDeleted: false };
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;

    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (userId) {
        orgConditions.push(
          { userId },
          { createdBy: userId },
          { adminId: userId },
          { assigneeId: userId },
          { reviewerId: userId }
        );
      }
      matchFilter.$or = orgConditions;
    } else if (userId) {
      const userConditions: any[] = [
        { userId },
        { createdBy: userId },
        { adminId: userId },
        { assigneeId: userId },
        { reviewerId: userId },
      ];

      matchFilter.$or = userConditions;
    }

    const tasks = await Task.find(matchFilter).lean();

    // Grouping map
    const groupMap = new Map<string, ITaskSummaryRow>();

    const getGroupKey = (t: any): { key: string; label: string; initials?: string; color?: string } => {
      switch (groupBy) {
        case 'Category':
          return { key: t.category || 'General', label: t.category || 'General' };
        case 'Client':
          return {
            key: t.clientName || 'Unknown',
            label: `${t.clientName} ${t.clientFileNo ? `(${t.clientFileNo})` : ''}`,
          };
        case 'Service':
          return { key: t.serviceName || 'General Service', label: t.serviceName || 'General Service' };
        case 'Priority':
          return { key: t.priority || 'Low', label: t.priority || 'Low' };
        case 'Task Type':
          return { key: t.taskType || 'One-Time Task', label: t.taskType || 'One-Time Task' };
        case 'Month':
          return { key: t.period || 'Jun 2026', label: t.period || 'Jun 2026' };
        case 'Financial Year':
          return { key: t.financialYear || 'FY 2026 - 2027', label: t.financialYear || 'FY 2026 - 2027' };
        case 'Assigned To':
        default:
          return {
            key: t.assigneeName || 'Unassigned',
            label: t.assigneeName || 'Unassigned',
            initials: t.assigneeInitials || t.assigneeName?.substring(0, 2).toUpperCase() || 'TM',
            color: t.assigneeColor || '#8B5CF6',
          };
      }
    };

    // Aggregate real database tasks
    for (const t of tasks) {
      const g = getGroupKey(t);
      let row = groupMap.get(g.key);
      if (!row) {
        row = {
          groupKey: g.key,
          groupLabel: g.label,
          initials: g.initials,
          avatarColor: g.color,
          pending: 0,
          inProgress: 0,
          sentForReview: 0,
          requestChanges: 0,
          wipSubTotal: 0,
          overdue: 0,
          dueToday: 0,
          completed: 0,
          readyToBill: 0,
          onHold: 0,
          total: 0,
          donePercentage: 0,
        };
        groupMap.set(g.key, row);
      }

      if (t.status === 'Pending') row.pending++;
      else if (t.status === 'In Progress') row.inProgress++;
      else if (t.status === 'Sent for Review') row.sentForReview++;
      else if (t.status === 'Request Changes') row.requestChanges++;
      else if (t.status === 'Overdue') row.overdue++;
      else if (t.status === 'Completed') row.completed++;
      else if (t.status === 'Ready to Bill') row.readyToBill++;
      else if (t.status === 'On Hold') row.onHold++;

      row.wipSubTotal = row.pending + row.inProgress + row.sentForReview + row.requestChanges;
      row.total = row.wipSubTotal + row.completed + row.readyToBill + row.overdue + row.onHold;
      row.donePercentage = row.total > 0 ? Math.round((row.completed / row.total) * 1000) / 10 : 0;
    }

    let rows = Array.from(groupMap.values());

    // Filter by search if supplied
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.groupLabel.toLowerCase().includes(q));
    }

    // Compute Grand Total
    const grandTotal: ITaskSummaryRow = {
      groupKey: 'grand_total',
      groupLabel: 'Grand Total',
      pending: 0,
      inProgress: 0,
      sentForReview: 0,
      requestChanges: 0,
      wipSubTotal: 0,
      overdue: 0,
      dueToday: 0,
      completed: 0,
      readyToBill: 0,
      onHold: 0,
      total: 0,
      donePercentage: 0,
    };

    for (const r of rows) {
      grandTotal.pending += r.pending;
      grandTotal.inProgress += r.inProgress;
      grandTotal.sentForReview += r.sentForReview;
      grandTotal.requestChanges += r.requestChanges;
      grandTotal.wipSubTotal += r.wipSubTotal;
      grandTotal.overdue += r.overdue;
      grandTotal.dueToday += r.dueToday;
      grandTotal.completed += r.completed;
      grandTotal.readyToBill += r.readyToBill;
      grandTotal.onHold += r.onHold;
      grandTotal.total += r.total;
    }

    grandTotal.donePercentage =
      grandTotal.total > 0
        ? Math.round((grandTotal.completed / grandTotal.total) * 1000) / 10
        : 0;

    return { rows, grandTotal };
  }

  /**
   * Get single task by ID or Task Code (e.g. #TSK06008)
   */
  static async getTaskById(id: string): Promise<ITaskDocument> {
    await this.seedInitialTasksIfNeeded();

    let task: ITaskDocument | null = null;

    // 1. Try finding by MongoDB _id if valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      try {
        task = await Task.findById(id);
      } catch {
        task = null;
      }
    }

    // 2. Exact taskId match (e.g. #TSK05996)
    if (!task) {
      task = await Task.findOne({ taskId: id, isDeleted: false });
    }

    // 3. Normalised task code variations (e.g. tsk-05996, TSK05996, #TSK05996, 05996)
    if (!task) {
      const cleanDigits = id.replace(/[^0-9]/g, '');
      const possibleTaskIds = [
        id.startsWith('#') ? id : `#${id}`,
        id.toUpperCase(),
        cleanDigits ? `#TSK0${cleanDigits}` : null,
        cleanDigits ? `#TSK${cleanDigits}` : null,
      ].filter(Boolean) as string[];

      task = await Task.findOne({
        $or: [
          ...possibleTaskIds.map((tId) => ({ taskId: tId })),
          { taskId: new RegExp(id.replace(/^#/, ''), 'i') },
        ],
        isDeleted: false,
      });
    }

    if (!task) {
      throw AppError.notFound(ResponseMessages.TASK_NOT_FOUND);
    }

    // Auto-populate from Service if task items are empty but service is linked
    if (
      (!task.checklist?.length || !task.subTasks?.length || !task.documentRequests?.length) &&
      (task.serviceId || task.serviceName)
    ) {
      try {
        const srv = task.serviceId
          ? await Service.findById(task.serviceId).lean()
          : await Service.findOne({
              name: { $regex: new RegExp(`^${task.serviceName?.trim()}$`, 'i') },
              isDeleted: false,
            }).lean();

        if (srv) {
          let modified = false;
          if (!task.subTasks?.length && srv.subTasks?.length) {
            task.subTasks = srv.subTasks.map((t: any, idx: number) => ({
              id: t.id || String(idx + 1),
              title: t.title || t.name || `Step ${idx + 1}`,
              name: t.name || t.title || `Step ${idx + 1}`,
              description: t.description || '',
              completed: false,
              totalHours: t.totalHours || '00:00:00',
              timeSpent: '00:00:00',
              taskId: task.taskId,
              serviceId: srv._id?.toString(),
            }));
            task.markModified('subTasks');
            modified = true;
          }

          if (!task.checklist?.length && srv.checklist?.length) {
            task.checklist = srv.checklist.map((c: any, idx: number) => ({
              id: c.id || `c${idx + 1}`,
              title: c.title || c.name || `Checklist ${idx + 1}`,
              completed: false,
              isMandatory: c.isMandatory !== false,
              taskId: task.taskId,
              serviceId: srv._id?.toString(),
            }));
            task.markModified('checklist');
            modified = true;
          }

          if (!task.documentRequests?.length && srv.documentRequests?.length) {
            task.documentRequests = srv.documentRequests.map((d: any, idx: number) => ({
              id: d.id || `d${idx + 1}`,
              title: d.title || d.name || `Document ${idx + 1}`,
              description: d.description || '',
              status: 'Pending',
              isMandatory: d.isMandatory !== false,
              taskId: task.taskId,
              serviceId: srv._id?.toString(),
            }));
            task.markModified('documentRequests');
            modified = true;
          }

          if (!task.sop && (srv as any).sop) {
            task.sop = (srv as any).sop;
            modified = true;
          }

          if (modified) {
            await task.save();
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    return task;
  }

  /**
   * Create a new task
   */
  static async createTask(
    data: Partial<ITask>,
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string }
  ): Promise<ITaskDocument> {
    // Always generate taskId strictly and atomically via Dedicated Counter Collection
    const taskId = await CounterService.getNextTaskId();

    let subTasks: any[] = data.subTasks || [];
    let checklist: any[] = data.checklist || [];
    let documentRequests: any[] = data.documentRequests || [];

    // Find linked service to populate if empty, or to obtain serviceId / SOP
    let srv: any = null;
    if (data.serviceId || data.serviceName) {
      try {
        srv = data.serviceId
          ? await Service.findById(data.serviceId).lean()
          : await Service.findOne({
              name: { $regex: new RegExp(`^${data.serviceName?.trim()}$`, 'i') },
              isDeleted: false,
            }).lean();
      } catch {
        srv = null;
      }
    }

    const resolvedServiceId = data.serviceId || srv?._id?.toString() || null;

    if (!subTasks?.length && srv?.subTasks?.length) {
      subTasks = srv.subTasks.map((t: any, idx: number) => {
        if (typeof t === 'string') {
          return {
            id: String(idx + 1),
            title: t,
            name: t,
            completed: false,
            timeSpent: '00:00:00',
            taskId,
            serviceId: resolvedServiceId,
          };
        }
        return {
          id: t.id || String(idx + 1),
          title: t.name || t.title || `Step ${idx + 1}`,
          name: t.name || t.title || `Step ${idx + 1}`,
          description: t.description || '',
          completed: false,
          totalHours: t.totalHours || '00:00:00',
          timeSpent: '00:00:00',
          taskId,
          serviceId: resolvedServiceId,
        };
      });
    }

    if (!checklist?.length && srv?.checklist?.length) {
      checklist = srv.checklist.map((c: any, idx: number) => {
        if (typeof c === 'string') {
          return {
            id: `c${idx + 1}`,
            title: c,
            completed: false,
            isMandatory: true,
            taskId,
            serviceId: resolvedServiceId,
          };
        }
        return {
          id: c.id || `c${idx + 1}`,
          title: c.title || c.name || `Checklist ${idx + 1}`,
          completed: false,
          isMandatory: c.isMandatory !== false,
          taskId,
          serviceId: resolvedServiceId,
        };
      });
    }

    if (!documentRequests?.length && srv?.documentRequests?.length) {
      documentRequests = srv.documentRequests.map((d: any, idx: number) => {
        if (typeof d === 'string') {
          return {
            id: `d${idx + 1}`,
            title: d,
            status: 'Pending',
            isMandatory: true,
            taskId,
            serviceId: resolvedServiceId,
          };
        }
        return {
          id: d.id || `d${idx + 1}`,
          title: d.title || d.name || `Document ${idx + 1}`,
          description: d.description || '',
          status: 'Pending',
          isMandatory: d.isMandatory !== false,
          taskId,
          serviceId: resolvedServiceId,
        };
      });
    }

    // Stamp taskId and serviceId on all items (whether provided or inherited)
    subTasks = subTasks.map((st: any, idx: number) => ({
      ...st,
      id: st.id || String(idx + 1),
      title: st.title || st.name || `Step ${idx + 1}`,
      name: st.name || st.title || `Step ${idx + 1}`,
      completed: !!st.completed,
      timeSpent: st.timeSpent || '00:00:00',
      taskId,
      serviceId: st.serviceId || resolvedServiceId,
    }));

    checklist = checklist.map((cl: any, idx: number) => ({
      ...cl,
      id: cl.id || `c${idx + 1}`,
      title: cl.title || cl.name || `Checklist ${idx + 1}`,
      completed: !!cl.completed,
      isMandatory: cl.isMandatory !== false,
      taskId,
      serviceId: cl.serviceId || resolvedServiceId,
    }));

    documentRequests = documentRequests.map((doc: any, idx: number) => ({
      ...doc,
      id: doc.id || `d${idx + 1}`,
      title: doc.title || doc.name || `Document ${idx + 1}`,
      status: doc.status || 'Pending',
      isMandatory: doc.isMandatory !== false,
      taskId,
      serviceId: doc.serviceId || resolvedServiceId,
    }));

    let sop = data.sop;
    if (!sop && srv?.sop) {
      sop = srv.sop;
    }

    const orgId = userCtx?.orgId || data.orgId || null;
    const userId = userCtx?.userId || data.userId || null;
    const creatorName = data.creatorName || userCtx?.name || '';
    const adminId = data.adminId || userId || '';

    const task = new Task({
      ...data,
      taskId,
      orgId,
      userId,
      createdBy: userId,
      serviceId: resolvedServiceId,
      sop: sop || '',
      taskName: data.taskName?.trim() || '-',
      clientName: data.clientName?.trim(),
      serviceName: data.serviceName?.trim(),
      assigneeName: data.assigneeName?.trim(),
      creatorName,
      adminId,
      status: data.status || 'Pending',
      billingType: data.billingType || 'Billable',
      billingStatus: data.billingType === 'Billable' ? 'Pending' : 'Billed',
      subTasks,
      checklist,
      documentRequests,
      linkedEmails: data.linkedEmails || [],
      complianceStatus: {
        period: data.period || 'Jun 2026',
        dueDate: data.targetDueDate || '27 Jul, 2026',
        status: 'Pending',
        filedDate: '—',
        referenceNo: '—',
        attachmentsCount: 0,
      },
    });

    return await task.save();
  }

  /**
   * Update task by ID
   */
  static async updateTaskById(id: string, data: Partial<ITask>): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);

    Object.assign(task, data);

    if (data.checklist) {
      task.markModified('checklist');
    }
    if (data.documentRequests) {
      task.markModified('documentRequests');
    }
    if (data.subTasks) {
      task.markModified('subTasks');
    }
    if (data.complianceStatus) {
      task.markModified('complianceStatus');
    }

    return await task.save();
  }

  /**
   * Delete task by ID (soft delete)
   */
  static async deleteTaskById(id: string): Promise<void> {
    const task = await this.getTaskById(id);
    await task.softDelete();
  }

  /**
   * Add a comment to task conversation thread
   */
  static async addComment(
    id: string,
    comment: { text: string; author?: string; authorInitials?: string; avatarColor?: string }
  ): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);

    task.comments.push({
      id: Date.now().toString(),
      author: comment.author || 'Team Member',
      authorInitials: comment.authorInitials || 'TM',
      avatarColor: comment.avatarColor || '#3B82F6',
      text: comment.text,
      createdAt: new Date(),
    });

    return await task.save();
  }

  /**
   * Toggle completion of a subtask
   */
  static async toggleSubTask(id: string, subTaskId: string): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);

    const sub = task.subTasks.find(
      (s) => s.id === subTaskId || (s as any)._id?.toString() === subTaskId || String((s as any).id) === String(subTaskId)
    );
    if (sub) {
      sub.completed = !sub.completed;
      task.markModified('subTasks');
      await task.save();
    }

    return task;
  }

  /**
   * Toggle checklist item
   */
  static async toggleChecklist(id: string, itemId: string): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);
    const item = task.checklist.find(
      (c) => c.id === itemId || (c as any)._id?.toString() === itemId || String((c as any).id) === String(itemId)
    );
    if (item) {
      item.completed = !item.completed;
      task.markModified('checklist');
      await task.save();
    }
    return task;
  }

  /**
   * Toggle document request status
   */
  static async toggleDocumentRequest(
    id: string,
    docId: string,
    status?: 'Pending' | 'Received' | 'Requested'
  ): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);
    const doc = task.documentRequests.find(
      (d) => d.id === docId || (d as any)._id?.toString() === docId || String((d as any).id) === String(docId)
    );
    if (doc) {
      doc.status = status || (doc.status === 'Received' ? 'Pending' : 'Received');
      if (doc.status === 'Received') {
        doc.receivedAt = new Date();
      } else {
        doc.receivedAt = null as any;
      }
      task.markModified('documentRequests');
      await task.save();
    }
    return task;
  }

  /**
   * Upload document for a specific document request item on a task
   * Saves to Drive under Client Name and Task folder with clean document name
   */
  static async uploadTaskDocument(
    id: string,
    docId: string,
    file: Express.Multer.File,
    documentName?: string
  ): Promise<{ task: ITaskDocument; document: any }> {
    if (!file) {
      throw AppError.badRequest('No file provided for upload');
    }

    const task = await this.getTaskById(id);
    const doc = task.documentRequests.find(
      (d) => d.id === docId || (d as any)._id?.toString() === docId || String((d as any).id) === String(docId)
    );
    if (!doc) {
      throw AppError.notFound('Document request item not found on this task');
    }

    const title = documentName || doc.title || file.originalname;

    // Upload through DriveService with client name, subFolder (taskId), and document name
    const uploaded = await DriveService.uploadDocument(file, {
      category: DocumentCategory.GENERAL,
      description: `Task Document: ${title} for task ${task.taskId} - ${task.serviceName}`,
      clientId: task.clientId || undefined,
      clientName: task.clientName,
      subFolder: task.taskId,
      customFileName: title,
      tags: ['Task-Document', task.taskId, task.serviceName],
      uploadedBy: 'Practice Staff',
    });

    const fileUrl = uploaded.webViewLink || uploaded.previewUrl || `/api/v1/drive/${uploaded._id}/download`;

    doc.status = 'Received';
    doc.fileUrl = fileUrl;
    doc.receivedAt = new Date();

    task.markModified('documentRequests');
    await task.save();

    return { task, document: uploaded };
  }

  /**
   * Upload a general document attached directly to a task
   */
  static async uploadGeneralTaskDocument(
    id: string,
    file: Express.Multer.File,
    title: string,
    category?: DocumentCategory,
    description?: string
  ): Promise<{ task: ITaskDocument; document: any }> {
    if (!file) {
      throw AppError.badRequest('No file provided for upload');
    }

    const task = await this.getTaskById(id);
    const docTitle = title || file.originalname;

    const uploaded = await DriveService.uploadDocument(file, {
      category: category || DocumentCategory.GENERAL,
      description: description || `Task Document: ${docTitle} for task ${task.taskId}`,
      clientId: task.clientId || undefined,
      clientName: task.clientName,
      subFolder: task.taskId,
      customFileName: docTitle,
      tags: ['Task-Document', task.taskId, task.serviceName],
      uploadedBy: 'Practice Staff',
    });

    const fileUrl = uploaded.webViewLink || uploaded.previewUrl || `/api/v1/drive/${uploaded._id}/download`;

    const newDocItem = {
      id: `d_${Date.now()}`,
      title: docTitle,
      description: description || '',
      status: 'Received' as const,
      isMandatory: false,
      fileUrl,
      receivedAt: new Date(),
      taskId: task.taskId,
      serviceId: task.serviceId,
    };

    task.documentRequests.push(newDocItem as any);
    task.markModified('documentRequests');
    await task.save();

    return { task, document: uploaded };
  }

  /**
   * Link an email metadata pointer to a task
   */
  static async linkEmail(id: string, emailData: ILinkedEmail): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);
    if (!task.linkedEmails) {
      task.linkedEmails = [];
    }

    const alreadyLinked = task.linkedEmails.some((e) => e.messageId === emailData.messageId);
    if (!alreadyLinked) {
      task.linkedEmails.push({
        messageId: emailData.messageId,
        threadId: emailData.threadId,
        subject: emailData.subject || '',
        snippet: emailData.snippet || '',
        sender: emailData.sender || '',
        date: emailData.date ? new Date(emailData.date) : new Date(),
        linkedAt: emailData.linkedAt ? new Date(emailData.linkedAt) : new Date(),
      });
      task.markModified('linkedEmails');
      await task.save();
    }

    return task;
  }

  /**
   * Unlink an email from a task by messageId
   */
  static async unlinkEmail(id: string, messageId: string): Promise<ITaskDocument> {
    const task = await this.getTaskById(id);
    if (!task.linkedEmails || task.linkedEmails.length === 0) {
      return task;
    }

    task.linkedEmails = task.linkedEmails.filter((e) => e.messageId !== messageId);
    task.markModified('linkedEmails');
    await task.save();

    return task;
  }
}


