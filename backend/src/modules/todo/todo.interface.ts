import { Document, Types } from 'mongoose';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ITodo extends Document {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  completed: boolean;
  completedAt?: Date | null;
  status?: string;
  sourceType?: 'manual' | 'dsc' | 'license' | 'document' | 'task';
  sourceId?: string;
  dedupKey?: string;
  actionUrl?: string;
  actionLabel?: string;
  clientName?: string;
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminTaskItem {
  id: string;
  dedupKey: string;
  title: string;
  description: string;
  category: 'DSC' | 'License' | 'Document' | 'Compliance' | 'Task Review' | 'Personal';
  sourceType: 'dsc' | 'license' | 'document' | 'task' | 'manual';
  sourceId?: string;
  clientName: string;
  clientId?: string;
  dueDate: string;
  daysLeft?: number;
  priority: TaskPriority;
  status: 'Pending' | 'Expiring Soon' | 'Expired' | 'Completed' | 'Dismissed';
  actionUrl: string;
  actionLabel: string;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ITeamTaskItem {
  id: string;
  taskId: string;
  taskName: string;
  description: string;
  clientName: string;
  clientId: string;
  category: string;
  department: string;
  assigneeId: string;
  assigneeName: string;
  assigneeInitials: string;
  assigneeColor: string;
  priority: TaskPriority;
  startDate: string;
  targetDueDate: string;
  endDate?: string;
  status: string;
  progress: number;
  checklistTotal: number;
  checklistCompleted: number;
  isOverdue: boolean;
  checklist: Array<{ id: string; title: string; completed: boolean; isMandatory?: boolean }>;
  comments: Array<{ id: string; author: string; text: string; createdAt: string | Date }>;
  createdAt: string;
  updatedAt: string;
}

export interface ITodoSummary {
  role: 'admin' | 'employee';
  adminTasksTotal?: number;
  adminTasksUrgent?: number;
  adminTasksCompleted?: number;
  teamTasksActive?: number;
  teamTasksOverdue?: number;
  teamTasksCompleted?: number;
  teamAvgProgress?: number;
  assignedTotal?: number;
  assignedPending?: number;
  assignedInProgress?: number;
  assignedOverdue?: number;
  assignedCompleted?: number;
  overallProgress?: number;
}

export interface ITodoCalendarEvent {
  id: string;
  date: string;
  title: string;
  clientName: string;
  category: string;
  type: 'admin_deadline' | 'task_due' | 'task_start' | 'personal_todo';
  priority: TaskPriority;
  status: string;
  isOverdue: boolean;
  isCompleted: boolean;
  actionUrl?: string;
  taskId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeColor?: string;
  assigneeId?: string;
  isPersonal?: boolean;
}
