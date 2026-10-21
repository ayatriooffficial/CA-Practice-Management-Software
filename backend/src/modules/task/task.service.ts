import { Task } from './task.model';
import { Service } from '../service/service.model';
import {
  ITask,
  ITaskDocument,
  ITaskSummaryRow,
  ITaskStats,
} from './task.interface';
import { QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';



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
  }): Promise<{ items: ITaskDocument[]; pagination: PaginationMeta }> {
    await this.seedInitialTasksIfNeeded();

    const filter: Record<string, any> = { isDeleted: false };

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
        filter.assigneeName = { $in: ['Milton', 'Likith', 'Deekshith'] };
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
      filter.$or = [
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
      ];
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
  static async getTaskStats(category?: string): Promise<ITaskStats> {
    await this.seedInitialTasksIfNeeded();

    const matchFilter: Record<string, any> = { isDeleted: false };
    if (category && category !== 'All Categories') {
      matchFilter.category = category;
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
    search?: string
  ): Promise<{ rows: ITaskSummaryRow[]; grandTotal: ITaskSummaryRow }> {
    await this.seedInitialTasksIfNeeded();

    const tasks = await Task.find({ isDeleted: false }).lean();

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

    if (id.startsWith('#') || id.startsWith('TSK')) {
      const formatted = id.startsWith('#') ? id : `#${id}`;
      task = await Task.findOne({ taskId: formatted, isDeleted: false });
    }

    if (!task) {
      try {
        task = await Task.findById(id);
      } catch {
        task = null;
      }
    }

    if (!task) {
      task = await Task.findOne({ taskId: id, isDeleted: false });
    }

    if (!task) {
      throw AppError.notFound(ResponseMessages.TASK_NOT_FOUND);
    }

    return task;
  }

  /**
   * Create a new task
   */
  static async createTask(data: Partial<ITask>): Promise<ITaskDocument> {
    let taskId = data.taskId;

    if (!taskId) {
      const highestTask = await Task.findOne({}, { taskId: 1 })
        .sort({ createdAt: -1 })
        .lean();

      let nextNum = 6009;
      if (highestTask?.taskId) {
        const match = highestTask.taskId.match(/\d+/);
        if (match) {
          nextNum = parseInt(match[0], 10) + 1;
        }
      }
      taskId = `#TSK0${nextNum}`;
    }

    let subTasks = data.subTasks;
    let checklist = data.checklist;
    let documentRequests = data.documentRequests;

    if ((!subTasks?.length || !checklist?.length || !documentRequests?.length) && (data.serviceId || data.serviceName)) {
      try {
        const srv = data.serviceId
          ? await Service.findById(data.serviceId).lean()
          : await Service.findOne({ name: { $regex: new RegExp(`^${data.serviceName?.trim()}$`, 'i') } }).lean();

        if (srv) {
          if (!subTasks?.length && srv.subTasks?.length) {
            subTasks = srv.subTasks.map((t: any, idx: number) => {
              if (typeof t === 'string') {
                return {
                  id: String(idx + 1),
                  title: t,
                  completed: false,
                  timeSpent: '00:00:00',
                };
              }
              return {
                id: t.id || String(idx + 1),
                title: t.name || t.title || `Step ${idx + 1}`,
                completed: false,
                timeSpent: t.totalHours || '00:00:00',
              };
            });
          }

          if (!checklist?.length && (srv as any).checklist?.length) {
            checklist = (srv as any).checklist.map((c: any, idx: number) => {
              if (typeof c === 'string') {
                return {
                  id: `c${idx + 1}`,
                  title: c,
                  completed: false,
                  isMandatory: true,
                };
              }
              return {
                id: c.id || `c${idx + 1}`,
                title: c.title || c.name || `Checklist ${idx + 1}`,
                completed: false,
                isMandatory: c.isMandatory !== false,
              };
            });
          }

          if (!documentRequests?.length && (srv as any).documentRequests?.length) {
            documentRequests = (srv as any).documentRequests.map((d: any, idx: number) => {
              if (typeof d === 'string') {
                return {
                  id: `d${idx + 1}`,
                  title: d,
                  status: 'Pending',
                  isMandatory: true,
                };
              }
              return {
                id: d.id || `d${idx + 1}`,
                title: d.title || d.name || `Document ${idx + 1}`,
                status: 'Pending',
                isMandatory: d.isMandatory !== false,
              };
            });
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    if (!subTasks?.length) {
      subTasks = [
        { id: '1', title: 'Step 1 - Collect Invoices & Statements', completed: false, timeSpent: '00:00:00' },
        { id: '2', title: 'Step 2 - Verification & Reconciliation', completed: false, timeSpent: '00:00:00' },
        { id: '3', title: 'Step 3 - File on Portal & Send to Client', completed: false, timeSpent: '00:00:00' },
      ];
    }

    if (!checklist?.length) {
      checklist = [
        { id: 'c1', title: 'Verify Source Invoices & Bank Statements', completed: false, isMandatory: true },
        { id: 'c2', title: 'Reconcile 2B/GSTR Data on Portal', completed: false, isMandatory: true },
        { id: 'c3', title: 'Review Tax Computation & Get Partner Sign-off', completed: false, isMandatory: true },
      ];
    }

    if (!documentRequests?.length) {
      documentRequests = [
        { id: 'd1', title: 'Sales Register & Output Tax Summary', status: 'Pending', isMandatory: true },
        { id: 'd2', title: 'Bank Account Statement (Monthly)', status: 'Pending', isMandatory: true },
      ];
    }

    const task = new Task({
      ...data,
      taskId,
      taskName: data.taskName?.trim() || '-',
      clientName: data.clientName?.trim(),
      serviceName: data.serviceName?.trim(),
      assigneeName: data.assigneeName?.trim(),
      creatorName: data.creatorName || 'Dipak Sahani',
      adminId: data.adminId || 'admin-dipak-sahani',
      status: data.status || 'Pending',
      billingType: data.billingType || 'Billable',
      billingStatus: data.billingType === 'Billable' ? 'Pending' : 'Billed',
      subTasks,
      checklist,
      documentRequests,
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
      author: comment.author || 'Likith S',
      authorInitials: comment.authorInitials || 'LI',
      avatarColor: comment.avatarColor || '#06B6D4',
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

    const sub = task.subTasks.find((s) => s.id === subTaskId);
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
    const item = task.checklist.find((c) => c.id === itemId);
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
    const doc = task.documentRequests.find((d) => d.id === docId);
    if (doc) {
      doc.status = status || (doc.status === 'Received' ? 'Pending' : 'Received');
      if (doc.status === 'Received') {
        doc.receivedAt = new Date();
      }
      task.markModified('documentRequests');
      await task.save();
    }
    return task;
  }
}

