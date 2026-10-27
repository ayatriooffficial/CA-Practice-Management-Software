import { request, ApiResponse } from './apiClient';
import {
  TaskItem,
  TaskStats,
  TaskSummaryRow,
  INITIAL_TASKS,
  LinkedEmail,
} from '@/data/taskData';

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
}

let fallbackTasks: TaskItem[] = [];

function getStoredTasks(): TaskItem[] {
  return fallbackTasks;
}

function saveStoredTasks(tasks: TaskItem[]): void {
  fallbackTasks = tasks;
}

export const taskApi = {
  getTasks: async (params: TaskQueryParams = {}): Promise<ApiResponse<TaskItem[]>> => {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.search?.trim()) searchParams.set('search', params.search.trim());
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      if (params.category && params.category !== 'All Categories') searchParams.set('category', params.category);
      if (params.quickFilter && params.quickFilter !== 'All Tasks') searchParams.set('quickFilter', params.quickFilter);
      if (params.status) searchParams.set('status', params.status);
      if (params.assigneeName && params.assigneeName !== 'All Assignees') searchParams.set('assigneeName', params.assigneeName);
      if (params.department && params.department !== 'All Dept') searchParams.set('department', params.department);
      if (params.financialYear) searchParams.set('financialYear', params.financialYear);
      if (params.period) searchParams.set('period', params.period);
      if (params.clientId) searchParams.set('clientId', params.clientId);
      if (params.clientFileNo) searchParams.set('clientFileNo', params.clientFileNo);
      if (params.clientName) searchParams.set('clientName', params.clientName);

      const query = searchParams.toString();
      const res = await request<TaskItem[]>(`/tasks${query ? `?${query}` : ''}`);
      if (res && res.data !== undefined) {
        if (Array.isArray(res.data)) {
          saveStoredTasks(res.data);
        }
        return res;
      }
    } catch {
      // Return empty array on failure
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Tasks retrieved',
      data: fallbackTasks,
      pagination: {
        totalDocs: fallbackTasks.length,
        totalPages: 1,
        page: 1,
        limit: params.limit || 50,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  getTaskStats: async (category?: string): Promise<ApiResponse<TaskStats>> => {
    try {
      const q = category && category !== 'All Categories' ? `?category=${encodeURIComponent(category)}` : '';
      const res = await request<TaskStats>(`/tasks/stats${q}`);
      if (res && res.data) return res;
    } catch {
      // Fallback
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Stats retrieved',
      data: {
        wip: 0,
        pending: 0,
        inProgress: 0,
        sentForReview: 0,
        requestChanges: 0,
        overdue: 0,
        completed: 0,
        readyToBill: 0,
        cancelled: 0,
        allTasks: 0,
      },
    };
  },

  getTaskSummaryMatrix: async (
    groupBy: string = 'Assigned To',
    search?: string,
    assigneeFilter?: string
  ): Promise<ApiResponse<{ rows: TaskSummaryRow[]; grandTotal: TaskSummaryRow }>> => {
    try {
      const params = new URLSearchParams();
      if (groupBy) params.set('groupBy', groupBy);
      if (search?.trim()) params.set('search', search.trim());
      if (assigneeFilter && assigneeFilter !== 'All Assignees') params.set('assigneeFilter', assigneeFilter);
      const query = params.toString();
      const res = await request<{ rows: TaskSummaryRow[]; grandTotal: TaskSummaryRow }>(
        `/tasks/summary-matrix${query ? `?${query}` : ''}`
      );
      if (res && res.data) return res;
    } catch {
      // Fallback
    }

    let tasks = getStoredTasks();
    if (assigneeFilter && assigneeFilter.trim() && assigneeFilter !== 'All Assignees') {
      const filterLower = assigneeFilter.trim().toLowerCase();
      tasks = tasks.filter(
        (t) =>
          (t.assigneeName && t.assigneeName.toLowerCase().includes(filterLower)) ||
          (t.assigneeId && t.assigneeId.toLowerCase() === filterLower)
      );
    }
    const groupsMap = new Map<string, TaskItem[]>();

    tasks.forEach((t) => {
      let key = t.assigneeName || 'Unassigned';
      if (groupBy === 'Client') key = t.clientName || 'General';
      else if (groupBy === 'Department') key = t.department || 'General';
      else if (groupBy === 'Service') key = t.serviceName || 'General';

      if (search?.trim() && !key.toLowerCase().includes(search.trim().toLowerCase())) return;

      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(t);
    });

    const rows: TaskSummaryRow[] = Array.from(groupsMap.entries()).map(([label, list]) => {
      const pending = list.filter((x) => x.status === 'Pending').length;
      const inProgress = list.filter((x) => x.status === 'In Progress').length;
      const sentForReview = list.filter((x) => x.status === 'Sent for Review').length;
      const requestChanges = list.filter((x) => x.status === 'Request Changes').length;
      const wipSubTotal = inProgress + sentForReview + requestChanges;
      const overdue = list.filter((x) => x.status === 'Overdue').length;
      const dueToday = 0;
      const completed = list.filter((x) => x.status === 'Completed').length;
      const readyToBill = list.filter((x) => x.status === 'Ready to Bill').length;
      const onHold = list.filter((x) => x.status === 'On Hold').length;
      const total = list.length;
      const donePercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        groupKey: label.toLowerCase().replace(/\s+/g, '_'),
        groupLabel: label,
        pending,
        inProgress,
        sentForReview,
        requestChanges,
        wipSubTotal,
        overdue,
        dueToday,
        completed,
        readyToBill,
        onHold,
        total,
        donePercentage,
      };
    });

    const grandTotal: TaskSummaryRow = {
      groupKey: 'grand_total',
      groupLabel: 'Grand Total',
      pending: rows.reduce((s, r) => s + r.pending, 0),
      inProgress: rows.reduce((s, r) => s + r.inProgress, 0),
      sentForReview: rows.reduce((s, r) => s + r.sentForReview, 0),
      requestChanges: rows.reduce((s, r) => s + r.requestChanges, 0),
      wipSubTotal: rows.reduce((s, r) => s + r.wipSubTotal, 0),
      overdue: rows.reduce((s, r) => s + r.overdue, 0),
      dueToday: rows.reduce((s, r) => s + r.dueToday, 0),
      completed: rows.reduce((s, r) => s + r.completed, 0),
      readyToBill: rows.reduce((s, r) => s + r.readyToBill, 0),
      onHold: rows.reduce((s, r) => s + r.onHold, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
      donePercentage: 0,
    };
    grandTotal.donePercentage = grandTotal.total > 0 ? Math.round((grandTotal.completed / grandTotal.total) * 100) : 0;

    return {
      success: true,
      statusCode: 200,
      message: 'Summary matrix retrieved',
      data: {
        rows,
        grandTotal,
      },
    };
  },

  getTaskById: async (id: string): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>(`/tasks/${encodeURIComponent(id)}`);
      if (res.data) return res;
    } catch {
      // Fallback
    }

    const found =
      fallbackTasks.find(
        (t) =>
          t.id === id ||
          t.taskId === id ||
          t.taskId.replace('#', '') === id.replace('#', '')
      ) || fallbackTasks[0];

    return {
      success: true,
      statusCode: 200,
      message: 'Task retrieved',
      data: found,
    };
  },

  createTask: async (payload: Partial<TaskItem>): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.data) {
        fallbackTasks.unshift(res.data);
        saveStoredTasks(fallbackTasks);
        return res;
      }
    } catch {
      // Fallback
    }

    const nextIdNum = 6009 + fallbackTasks.length;
    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      taskId: payload.taskId || `#TSK0${nextIdNum}`,
      taskName: payload.taskName || '-',
      clientId: payload.clientId,
      clientName: payload.clientName || 'Demo Client',
      clientFileNo: payload.clientFileNo || '',
      clientPan: payload.clientPan || '-',
      legalName: payload.legalName || payload.clientName || '',
      serviceId: payload.serviceId,
      serviceName: payload.serviceName || 'Service',
      frequency: payload.frequency || 'Monthly',
      period: payload.period || 'Jun 2026',
      financialYear: payload.financialYear || 'FY 2026 - 2027',
      department: payload.department || 'GST',
      assigneeId: payload.assigneeId,
      assigneeName: payload.assigneeName || 'Unassigned',
      assigneeInitials: payload.assigneeInitials || (payload.assigneeName ? payload.assigneeName.slice(0, 2).toUpperCase() : 'UA'),
      assigneeColor: payload.assigneeColor || '#31719B',
      reviewerId: payload.reviewerId,
      reviewerName: payload.reviewerName || '',
      priority: payload.priority || 'Low',
      startDate: payload.startDate || '27/07/2026',
      targetDueDate: payload.targetDueDate || '27/07/2026',
      endDate: payload.endDate || '27/07/2026',
      billingType: payload.billingType || 'Billable',
      billingStatus: payload.billingType === 'Billable' ? 'Pending' : 'Billed',
      isSprintPlanner: !!payload.isSprintPlanner,
      category: payload.category || 'GST',
      taskType: payload.taskType || 'One-Time Task',
      status: payload.status || 'Pending',
      description: payload.description || '',
      createProformaInvoice: !!payload.createProformaInvoice,
      creatorName: '',
      adminId: '',
      subTasks: payload.subTasks || [
        { id: '1', title: 'Step 1 - Collect Invoices', completed: false, timeSpent: '00:00:00' },
        { id: '2', title: 'Step 2 - Verification & Reconciliation', completed: false, timeSpent: '00:00:00' },
        { id: '3', title: 'Step 3 - Final Filing & Client Submission', completed: false, timeSpent: '00:00:00' },
      ],
      checklist: payload.checklist || [
        { id: 'c1', title: 'Verify Source Invoices & Bank Statements', completed: false, isMandatory: true },
        { id: 'c2', title: 'Reconcile 2B/GSTR Data on Portal', completed: false, isMandatory: true },
        { id: 'c3', title: 'Review Tax Computation & Get Partner Sign-off', completed: false, isMandatory: true },
      ],
      documentRequests: payload.documentRequests || [
        { id: 'd1', title: 'Sales Register & Output Tax Summary', status: 'Pending', isMandatory: true },
        { id: 'd2', title: 'Bank Account Statement (Monthly)', status: 'Pending', isMandatory: true },
      ],
      comments: [],
      complianceStatus: {
        period: payload.period || 'Jun 2026',
        dueDate: payload.targetDueDate || '27 Jul, 2026',
        status: 'Pending',
        filedDate: '—',
        referenceNo: '—',
        attachmentsCount: 0,
      },
      createdAt: new Date().toISOString(),
    };

    fallbackTasks.unshift(newTask);
    saveStoredTasks(fallbackTasks);
    return {
      success: true,
      statusCode: 201,
      message: 'Task created successfully',
      data: newTask,
    };
  },

  updateTask: async (id: string, payload: Partial<TaskItem>): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>(`/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.data) {
        const idx = fallbackTasks.findIndex((t) => t.id === id || t.taskId === id);
        if (idx !== -1) fallbackTasks[idx] = { ...fallbackTasks[idx], ...res.data };
        saveStoredTasks(fallbackTasks);
        return res;
      }
    } catch {
      // Fallback
    }

    const idx = fallbackTasks.findIndex((t) => t.id === id || t.taskId === id);
    if (idx !== -1) {
      fallbackTasks[idx] = { ...fallbackTasks[idx], ...payload };
      saveStoredTasks(fallbackTasks);
      return {
        success: true,
        statusCode: 200,
        message: 'Task updated successfully',
        data: fallbackTasks[idx],
      };
    }

    return {
      success: false,
      statusCode: 404,
      message: 'Task not found',
      data: null as any,
    };
  },

  deleteTask: async (id: string): Promise<ApiResponse<null>> => {
    try {
      await request<null>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Fallback
    }
    fallbackTasks = fallbackTasks.filter((t) => t.id !== id && t.taskId !== id);
    saveStoredTasks(fallbackTasks);
    return {
      success: true,
      statusCode: 200,
      message: 'Task deleted successfully',
      data: null,
    };
  },

  addComment: async (
    id: string,
    text: string,
    author: string = 'Staff',
    authorInitials: string = 'ST',
    avatarColor: string = '#6366F1'
  ): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>(`/tasks/${encodeURIComponent(id)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text, author, authorInitials, avatarColor }),
      });
      if (res.data) return res;
    } catch {
      // Fallback
    }

    const task = fallbackTasks.find((t) => t.id === id || t.taskId === id);
    if (task) {
      task.comments.push({
        id: `c-${Date.now()}`,
        author,
        authorInitials,
        avatarColor,
        text,
        createdAt: new Date().toISOString(),
      });
      return {
        success: true,
        statusCode: 200,
        message: 'Comment added',
        data: task,
      };
    }

    return {
      success: false,
      statusCode: 404,
      message: 'Task not found',
      data: null as any,
    };
  },

  toggleSubTask: async (id: string, subTaskId: string): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>(
        `/tasks/${encodeURIComponent(id)}/subtasks/${encodeURIComponent(subTaskId)}/toggle`,
        { method: 'PATCH' }
      );
      if (res.data) return res;
    } catch {
      // Fallback
    }

    const task = fallbackTasks.find((t) => t.id === id || t.taskId === id);
    if (task) {
      const sub = task.subTasks.find((s) => s.id === subTaskId);
      if (sub) sub.completed = !sub.completed;
      return { success: true, statusCode: 200, message: 'Subtask toggled', data: task };
    }

    return { success: false, statusCode: 404, message: 'Task not found', data: null as any };
  },

  toggleChecklist: async (id: string, itemId: string): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>(
        `/tasks/${encodeURIComponent(id)}/checklist/${encodeURIComponent(itemId)}/toggle`,
        { method: 'PATCH' }
      );
      if (res.data) return res;
    } catch {
      // Fallback
    }

    const task = fallbackTasks.find((t) => t.id === id || t.taskId === id);
    if (task) {
      const item = task.checklist.find((c) => c.id === itemId);
      if (item) item.completed = !item.completed;
      return { success: true, statusCode: 200, message: 'Checklist toggled', data: task };
    }

    return { success: false, statusCode: 404, message: 'Task not found', data: null as any };
  },

  toggleDocumentRequest: async (
    id: string,
    docId: string,
    status?: 'Pending' | 'Received' | 'Requested'
  ): Promise<ApiResponse<TaskItem>> => {
    try {
      const res = await request<TaskItem>(
        `/tasks/${encodeURIComponent(id)}/document-requests/${encodeURIComponent(docId)}/toggle`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      if (res.data) return res;
    } catch {
      // Fallback
    }

    const task = fallbackTasks.find((t) => t.id === id || t.taskId === id);
    if (task) {
      const doc = task.documentRequests.find((d) => d.id === docId);
      if (doc) {
        doc.status = status || (doc.status === 'Received' ? 'Pending' : 'Received');
        if (doc.status === 'Received') doc.receivedAt = new Date().toISOString();
      }
      return { success: true, statusCode: 200, message: 'Document request toggled', data: task };
    }

    return { success: false, statusCode: 404, message: 'Task not found', data: null as any };
  },

  uploadDocumentRequestFile: async (
    taskId: string,
    docId: string,
    file: File,
    documentName?: string
  ): Promise<ApiResponse<{ task: TaskItem; document: any }>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentName) {
      formData.append('documentName', documentName);
    }
    return request<{ task: TaskItem; document: any }>(
      `/tasks/${encodeURIComponent(taskId)}/document-requests/${encodeURIComponent(docId)}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  uploadGeneralTaskDocument: async (
    taskId: string,
    file: File,
    title?: string,
    category?: string,
    description?: string
  ): Promise<ApiResponse<{ task: TaskItem; document: any }>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (category) formData.append('category', category);
    if (description) formData.append('description', description);
    return request<{ task: TaskItem; document: any }>(
      `/tasks/${encodeURIComponent(taskId)}/documents`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  linkEmailToTask: async (
    taskId: string,
    email: LinkedEmail
  ): Promise<ApiResponse<TaskItem>> => {
    return request<TaskItem>(`/tasks/${encodeURIComponent(taskId)}/emails`, {
      method: 'POST',
      body: JSON.stringify(email),
    });
  },

  unlinkEmailFromTask: async (
    taskId: string,
    messageId: string
  ): Promise<ApiResponse<TaskItem>> => {
    return request<TaskItem>(
      `/tasks/${encodeURIComponent(taskId)}/emails/${encodeURIComponent(messageId)}`,
      {
        method: 'DELETE',
      }
    );
  },
};
