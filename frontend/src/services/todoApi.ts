import { request } from './apiClient';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  category?: string;
  clientName?: string;
  clientId?: string;
  completed: boolean;
  completedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTaskItem {
  id: string;
  dedupKey: string;
  title: string;
  description: string;
  category: 'DSC' | 'License' | 'Document' | 'Task Review' | 'Personal' | string;
  sourceType: 'dsc' | 'license' | 'document' | 'task' | 'manual';
  sourceId?: string;
  clientName: string;
  clientId?: string;
  dueDate: string;
  daysLeft: number;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Expiring Soon' | 'Expired' | 'Completed';
  actionUrl: string;
  actionLabel: string;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTaskItem {
  id: string;
  taskId: string;
  taskName: string;
  description?: string;
  category?: string;
  clientName: string;
  clientId?: string;
  assigneeId: string;
  assigneeName: string;
  assigneeInitials?: string;
  assigneeColor?: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low' | string;
  status: 'Pending' | 'In Progress' | 'On Hold' | 'Sent for Review' | 'Completed' | 'Cancelled' | string;
  startDate?: string;
  targetDueDate: string;
  progress: number;
  checklistTotal: number;
  checklistCompleted: number;
  checklist: Array<{
    id: string;
    title: string;
    completed: boolean;
    isMandatory?: boolean;
  }>;
  comments?: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;
  isOverdue: boolean;
  daysLeft: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TodoSummary {
  role: 'admin' | 'employee';
  // Admin stats
  adminTasksTotal?: number;
  adminTasksUrgent?: number;
  adminTasksCompleted?: number;
  teamTasksActive?: number;
  teamTasksOverdue?: number;
  teamTasksCompleted?: number;
  teamAvgProgress?: number;
  // Employee stats
  assignedTotal?: number;
  assignedPending?: number;
  assignedInProgress?: number;
  assignedOverdue?: number;
  assignedCompleted?: number;
  overallProgress?: number;
}

export interface TodoCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'admin_deadline' | 'task_due' | 'task_start' | 'personal_todo';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: string;
  isOverdue: boolean;
  isCompleted: boolean;
  clientName?: string;
  assigneeName?: string;
  taskId?: string;
  actionUrl?: string;
}

export const todoApi = {
  // 1. Role-based summary counts
  getSummary: async (): Promise<TodoSummary> => {
    const res = await request<TodoSummary>('/todos/summary', { method: 'GET' });
    return res.data || { role: 'employee' };
  },

  // 2. Administrative tasks (Admin only)
  getAdminTasks: async (params?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<AdminTaskItem[]> => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await request<AdminTaskItem[]>(`/todos/admin-tasks${queryStr}`, { method: 'GET' });
    return res.data || [];
  },

  // 3. Toggle admin task completion/resolution
  toggleAdminTask: async (dedupKey: string, completed: boolean): Promise<any> => {
    const res = await request<any>('/todos/admin-tasks/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ dedupKey, completed }),
    });
    return res.data;
  },

  // 4. Team tasks delegation & monitoring (Admin only)
  getTeamTasks: async (params?: {
    employeeId?: string;
    employee?: string;
    clientId?: string;
    clientName?: string;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tasks: TeamTaskItem[]; total: number; totalPages: number }> => {
    const q = new URLSearchParams();
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    if (params?.employee) q.set('employee', params.employee);
    if (params?.clientId) q.set('clientId', params.clientId);
    if (params?.clientName) q.set('clientName', params.clientName);
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await request<{ tasks: TeamTaskItem[]; total: number; totalPages: number }>(
      `/todos/team-tasks${queryStr}`,
      { method: 'GET' }
    );
    return res.data || { tasks: [], total: 0, totalPages: 1 };
  },

  // 5. Employee tasks (strictly assigned to user)
  getMyTasks: async (params?: {
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<TeamTaskItem[]> => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.search) q.set('search', params.search);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await request<TeamTaskItem[]>(`/todos/my-tasks${queryStr}`, { method: 'GET' });
    return res.data || [];
  },

  // 6. Admin assign task to employee
  assignTask: async (data: {
    taskName: string;
    description?: string;
    category?: string;
    clientId?: string;
    clientName?: string;
    assigneeId: string;
    assigneeName?: string;
    priority?: string;
    startDate?: string;
    targetDueDate: string;
    checklist?: Array<{ title: string; isMandatory?: boolean }>;
  }): Promise<any> => {
    const res = await request<any>('/todos/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.data) throw new Error(res.message || 'Failed to assign task');
    return res.data;
  },

  // 7. Update task progress / checklist / status / note
  updateTaskProgress: async (
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
  ): Promise<any> => {
    const res = await request<any>(`/todos/tasks/${encodeURIComponent(taskId)}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.data) throw new Error(res.message || 'Failed to update task progress');
    return res.data;
  },

  // 8. Calendar events for To-Do
  getCalendarEvents: async (month?: string): Promise<TodoCalendarEvent[]> => {
    const queryStr = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await request<TodoCalendarEvent[]>(`/todos/calendar${queryStr}`, { method: 'GET' });
    return res.data || [];
  },

  // Legacy CRUD
  getTodos: async (): Promise<TodoItem[]> => {
    const res = await request<TodoItem[]>('/todos', { method: 'GET' });
    return res.data || [];
  },

  createTodo: async (
    title: string,
    dueDate?: string | null,
    extra?: {
      description?: string;
      priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
      category?: string;
      clientName?: string;
      clientId?: string;
    }
  ): Promise<TodoItem> => {
    const res = await request<TodoItem>('/todos', {
      method: 'POST',
      body: JSON.stringify({ title, dueDate, ...extra }),
    });
    if (!res.data) throw new Error(res.message || 'Failed to create to-do');
    return res.data;
  },

  updateTodo: async (
    id: string,
    updates: {
      title?: string;
      completed?: boolean;
      dueDate?: string | null;
      description?: string;
      priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
      category?: string;
    }
  ): Promise<TodoItem> => {
    const res = await request<TodoItem>(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!res.data) throw new Error(res.message || 'Failed to update to-do');
    return res.data;
  },

  deleteTodo: async (id: string): Promise<{ id: string }> => {
    const res = await request<{ id: string }>(`/todos/${id}`, {
      method: 'DELETE',
    });
    if (!res.data) throw new Error(res.message || 'Failed to delete to-do');
    return res.data;
  },
};
