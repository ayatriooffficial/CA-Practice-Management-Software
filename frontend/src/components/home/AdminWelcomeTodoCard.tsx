"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Check,
  CheckSquare,
  Calendar,
  Loader2,
  ArrowUpRight,
  AlertCircle,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { todoApi, TeamTaskItem, AdminTaskItem, TodoItem } from '../../services/todoApi';
import { useAuth } from '../auth/AuthContext';
import {
  getTodayKolkataYMD,
  getTomorrowKolkataYMD,
  parseDateToYMD,
  categorizeTaskByDate,
} from '../todo/todoDateUtils';

interface AdminWelcomeTodoCardProps {
  userName?: string;
}

type DateTab = 'all' | 'today' | 'tomorrow' | 'upcoming' | 'overdue' | 'completed';
type ScopeTab = 'my_work' | 'team_work' | 'all';

export const AdminWelcomeTodoCard: React.FC<AdminWelcomeTodoCardProps> = () => {
  const { currentUser } = useAuth();
  const role = (currentUser?.role || 'admin').toLowerCase().trim();
  const isAdmin = ['admin', 'owner', 'partner', 'manager'].includes(role);

  const [tasks, setTasks] = useState<TeamTaskItem[]>([]);
  const [activeTab, setActiveTab] = useState<DateTab>('today');
  const [adminScope, setAdminScope] = useState<ScopeTab>(isAdmin ? 'all' : 'my_work');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick add form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = useMemo(() => getTodayKolkataYMD(), []);
  const tomorrowStr = useMemo(() => getTomorrowKolkataYMD(), []);

  // Fetch real to-dos matching /to-do section logic
  const loadTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      if (isAdmin) {
        const [adminRes, teamRes, personalRes] = await Promise.all([
          todoApi.getAdminTasks().catch(() => []),
          todoApi.getTeamTasks({ limit: 100 }).catch(() => ({ tasks: [], total: 0 })),
          todoApi.getTodos().catch(() => []),
        ]);

        const mappedAdminTasks: TeamTaskItem[] = (adminRes || []).map((at) => ({
          id: at.dedupKey || at.id,
          taskId: at.sourceId || at.id,
          taskName: at.title,
          description: at.description,
          category: at.category || 'Administrative',
          clientName: at.clientName || '',
          clientId: at.clientId,
          assigneeId: currentUser?.id || 'admin',
          assigneeName: 'Admin',
          priority: at.priority || 'Medium',
          status: at.completed ? 'Completed' : at.status === 'Expired' ? 'Overdue' : 'Pending',
          targetDueDate: at.dueDate,
          progress: at.completed ? 100 : 0,
          checklistTotal: 1,
          checklistCompleted: at.completed ? 1 : 0,
          checklist: [],
          isOverdue: !at.completed && (at.daysLeft < 0 || at.status === 'Expired'),
          daysLeft: at.daysLeft,
          createdAt: at.createdAt,
          updatedAt: at.updatedAt,
          isAdministrative: true,
        } as any));

        const mappedPersonalTasks: TeamTaskItem[] = (personalRes || []).map((pt) => ({
          id: `pt_${pt.id}`,
          taskId: pt.id,
          taskName: pt.title,
          description: pt.description || '',
          category: pt.category || 'Personal',
          clientName: pt.clientName || '',
          clientId: pt.clientId,
          assigneeId: currentUser?.id || 'admin',
          assigneeName: currentUser?.name || 'Me',
          priority: pt.priority || 'Medium',
          status: pt.completed ? 'Completed' : 'Pending',
          targetDueDate: pt.dueDate || todayStr,
          progress: pt.completed ? 100 : 0,
          checklistTotal: 0,
          checklistCompleted: 0,
          checklist: [],
          isOverdue: !pt.completed && Boolean(pt.dueDate && pt.dueDate < todayStr),
          daysLeft: 0,
          createdAt: pt.createdAt,
          updatedAt: pt.updatedAt,
          isPersonal: true,
        } as any));

        const seenIds = new Set<string>();
        const merged: TeamTaskItem[] = [];

        // 1. Admin tasks
        for (const item of mappedAdminTasks) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            merged.push(item);
          }
        }

        // 2. Personal todos
        for (const item of mappedPersonalTasks) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            merged.push(item);
          }
        }

        // 3. Team tasks
        for (const item of teamRes.tasks || []) {
          const itemKey = item.taskId || item.id;
          if (!seenIds.has(itemKey) && !seenIds.has(item.id)) {
            seenIds.add(itemKey);
            merged.push(item);
          }
        }

        setTasks(merged);
      } else {
        const [myRes, teamRes, personalRes] = await Promise.all([
          todoApi.getMyTasks().catch(() => []),
          todoApi.getTeamTasks({ limit: 100 }).catch(() => ({ tasks: [], total: 0 })),
          todoApi.getTodos().catch(() => []),
        ]);

        const mappedPersonal: TeamTaskItem[] = (personalRes || []).map((pt) => ({
          id: `pt_${pt.id}`,
          taskId: pt.id,
          taskName: pt.title,
          description: pt.description || '',
          category: pt.category || 'Personal',
          clientName: pt.clientName || '',
          clientId: pt.clientId,
          assigneeId: currentUser?.id || 'user',
          assigneeName: currentUser?.name || 'Me',
          priority: pt.priority || 'Medium',
          status: pt.completed ? 'Completed' : 'Pending',
          targetDueDate: pt.dueDate || todayStr,
          progress: pt.completed ? 100 : 0,
          checklistTotal: 0,
          checklistCompleted: 0,
          checklist: [],
          isOverdue: !pt.completed && Boolean(pt.dueDate && pt.dueDate < todayStr),
          daysLeft: 0,
          createdAt: pt.createdAt,
          updatedAt: pt.updatedAt,
          isPersonal: true,
        } as any));

        const seenIds = new Set<string>();
        const merged: TeamTaskItem[] = [];

        // 1. Personal
        for (const item of mappedPersonal) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            merged.push(item);
          }
        }

        // 2. My tasks
        for (const item of myRes || []) {
          const itemKey = item.taskId || item.id;
          if (!seenIds.has(itemKey) && !seenIds.has(item.id)) {
            seenIds.add(itemKey);
            merged.push(item);
          }
        }

        // 3. Team tasks
        for (const item of teamRes.tasks || []) {
          const itemKey = item.taskId || item.id;
          if (!seenIds.has(itemKey) && !seenIds.has(item.id)) {
            seenIds.add(itemKey);
            merged.push(item);
          }
        }

        setTasks(merged);
      }
    } catch (err: any) {
      console.error('Failed to load to-do list in home section:', err);
      setError(err?.message || 'Failed to load to-do tasks');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin, currentUser, todayStr]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Filter tasks based on Scope (Admin sees all tasks without filter UI; Employee can filter)
  const scopedTasks = useMemo(() => {
    if (isAdmin || adminScope === 'all') return tasks;

    return tasks.filter((t) => {
      const isMine =
        (t as any).isAdministrative ||
        (t as any).isPersonal ||
        t.assigneeId === currentUser?.id ||
        t.assigneeName === currentUser?.name ||
        ((t as any).assignedTo && currentUser?.name && (t as any).assignedTo.toLowerCase() === currentUser.name.toLowerCase()) ||
        t.category === 'Personal';

      if (adminScope === 'my_work') return isMine;
      return !isMine; // team_work
    });
  }, [tasks, isAdmin, adminScope, currentUser]);

  // Compute Counts per Tab
  const tabCounts = useMemo(() => {
    let all = 0;
    let today = 0;
    let tomorrow = 0;
    let upcoming = 0;
    let overdue = 0;
    let completed = 0;

    scopedTasks.forEach((t) => {
      const isDone = (t.status || '').toLowerCase() === 'completed';
      if (isDone) {
        completed++;
      } else {
        all++;
        const cat = categorizeTaskByDate(t.targetDueDate, isDone);
        if (cat === 'today') today++;
        else if (cat === 'tomorrow') tomorrow++;
        else if (cat === 'upcoming') upcoming++;
        else if (cat === 'overdue') overdue++;
      }
    });

    return { all, today, tomorrow, upcoming, overdue, completed };
  }, [scopedTasks]);

  // Filter list by selected Tab
  const displayTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      const isDone = (t.status || '').toLowerCase() === 'completed';

      if (activeTab === 'completed') return isDone;
      if (isDone) return false;

      if (activeTab === 'all') return true;

      const cat = categorizeTaskByDate(t.targetDueDate, isDone);
      return cat === activeTab;
    });
  }, [scopedTasks, activeTab]);

  // Toggle Complete / Resolution
  const handleToggleTask = async (task: TeamTaskItem) => {
    const isDone = (task.status || '').toLowerCase() === 'completed';
    const nextStatus = isDone ? 'Pending' : 'Completed';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextStatus,
              progress: isDone ? 0 : 100,
            }
          : t
      )
    );

    try {
      if ((task as any).isAdministrative) {
        await todoApi.toggleAdminTask(task.id, !isDone);
      } else if ((task as any).isPersonal) {
        await todoApi.updateTodo(task.taskId || task.id.replace('pt_', ''), {
          completed: !isDone,
        });
      } else {
        await todoApi.updateTaskProgress(task.taskId || task.id, {
          status: nextStatus,
          progress: isDone ? 0 : 100,
        });
      }
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setError('Failed to update to-do item');
    }
  };

  // Quick Add To-Do
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const title = newTitle.trim();
    const dueDateToUse =
      newDueDate.trim() || (activeTab === 'tomorrow' ? tomorrowStr : todayStr);

    setIsSubmitting(true);
    const tempId = `temp_${Date.now()}`;
    const optimisticTask: TeamTaskItem = {
      id: tempId,
      taskId: tempId,
      taskName: title,
      category: 'General',
      clientName: '',
      assigneeId: currentUser?.id || 'admin',
      assigneeName: currentUser?.name || 'Me',
      priority: 'Medium',
      status: 'Pending',
      targetDueDate: dueDateToUse,
      progress: 0,
      checklistTotal: 0,
      checklistCompleted: 0,
      checklist: [],
      isOverdue: false,
      daysLeft: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPersonal: true,
    } as any;

    setTasks((prev) => [optimisticTask, ...prev]);
    setNewTitle('');
    setNewDueDate('');
    setIsAdding(false);

    try {
      const created = await todoApi.createTodo(title, dueDateToUse);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? ({
                ...t,
                id: `pt_${created.id}`,
                taskId: created.id,
              } as any)
            : t
        )
      );
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setError('Could not create to-do item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDueBadge = (dueDate?: string, isDone?: boolean) => {
    if (!dueDate) return null;
    const cat = categorizeTaskByDate(dueDate, Boolean(isDone));

    if (cat === 'today') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
          Today
        </span>
      );
    }
    if (cat === 'tomorrow') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 shrink-0">
          Tomorrow
        </span>
      );
    }
    if (cat === 'overdue') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 shrink-0 flex items-center gap-0.5">
          <AlertCircle size={9} />
          Overdue
        </span>
      );
    }

    const ymd = parseDateToYMD(dueDate);
    if (!ymd) return null;
    const parts = ymd.split('-');
    return (
      <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 shrink-0">
        {parts[2]}/{parts[1]}
      </span>
    );
  };

  const getPriorityDot = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p === 'urgent') return 'bg-rose-500';
    if (p === 'high') return 'bg-orange-500';
    if (p === 'medium') return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const tabs: Array<{ id: DateTab; label: string; count: number }> = [
    { id: 'today', label: 'Today', count: tabCounts.today },
    { id: 'tomorrow', label: 'Tomorrow', count: tabCounts.tomorrow },
    { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
    { id: 'overdue', label: 'Overdue', count: tabCounts.overdue },
    { id: 'completed', label: 'Completed', count: tabCounts.completed },
    { id: 'all', label: 'All', count: tabCounts.all },
  ];

  return (
    <div className="w-full h-full bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#dde2e8] dark:border-[#334155] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#31719B]" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <span>To-Do List</span>
            <span className="px-2 py-0.2 text-[11px] font-mono font-bold rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#31719B] dark:text-[#93c5fd] border border-blue-200/50 dark:border-blue-800/40">
              {displayTasks.length}
            </span>
          </h3>
        </div>

        {/* Right Actions: Add Task + View All in /to-do */}
        <div className="flex items-center gap-2">
          <Link
            href="/to-do?action=new"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-none bg-[#31719B] text-white hover:bg-[#285d80] active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </Link>

          <button
            type="button"
            onClick={() => loadTasks(true)}
            title="Refresh to-do list"
            aria-label="Refresh to-do list"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#31719B]' : ''} />
          </button>

          <Link
            href="/to-do"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#31719B] dark:text-[#93c5fd] hover:underline ml-1"
          >
            <span>View All</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-2 px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs matching To-Do section */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none border-b border-[#dde2e8] dark:border-[#334155] mt-2.5 pt-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-1.5 text-xs font-semibold relative transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                isActive
                  ? 'text-[#31719B] dark:text-[#93c5fd]'
                  : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-[#31719B] dark:text-[#93c5fd]'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd] rounded-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <form
          onSubmit={handleAddTask}
          className="mt-2.5 p-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-none flex items-center gap-2 flex-wrap"
        >
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[150px] text-xs bg-transparent border-0 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="text-[11px] px-2 py-0.5 rounded-none border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim()}
            className="px-2.5 py-0.5 text-xs font-semibold rounded-none bg-[#31719B] text-white hover:bg-[#285d80] disabled:opacity-50 transition-all cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Short & Informative List */}
      <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto scrollbar-slim mt-2.5 pr-1 divide-y divide-gray-100 dark:divide-slate-800/80">
        {isLoading ? (
          <div className="h-full flex items-center justify-center py-8 text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin text-[#31719B]" />
            <span className="text-xs">Loading to-do tasks...</span>
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-7 text-gray-400 dark:text-slate-500 gap-1">
            <CheckSquare size={20} className="text-gray-300 dark:text-slate-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              No tasks in {activeTab}
            </span>
            <span className="text-[11px] text-gray-400">
              Click &quot;Add Task&quot; above or open To-Do section to create tasks.
            </span>
          </div>
        ) : (
          displayTasks.map((task) => {
            const isDone = (task.status || '').toLowerCase() === 'completed';

            return (
              <div
                key={task.id}
                className="group py-2 px-1 flex items-center justify-between gap-2.5 hover:bg-gray-50/70 dark:hover:bg-[#162032] transition-colors rounded-none"
              >
                {/* Left: Checkbox + Title + Meta */}
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    className={`w-4 h-4 mt-0.5 rounded-none border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isDone
                        ? 'bg-[#10b981] border-[#10b981] text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-[#31719B]'
                    }`}
                  >
                    {isDone && <Check size={11} strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium leading-tight truncate ${
                        isDone
                          ? 'line-through text-gray-400 dark:text-slate-500'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {task.taskName}
                    </p>

                    {/* Metadata line: Category Tag + Client + Priority */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {task.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-none bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200/50 dark:border-slate-700/50">
                          {task.category}
                        </span>
                      )}

                      {task.clientName && (
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[110px]">
                          {task.clientName}
                        </span>
                      )}

                      {task.priority && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`}
                          />
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Due Date Badge */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {formatDueBadge(task.targetDueDate, isDone)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
