"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Check, Trash2, Calendar, Loader2, CheckSquare } from 'lucide-react';
import { todoApi, TodoItem } from '../../services/todoApi';

interface AdminWelcomeTodoCardProps {
  userName: string;
}

type TodoTab = 'today' | 'upcoming' | 'completed';

export const AdminWelcomeTodoCard: React.FC<AdminWelcomeTodoCardProps> = ({ userName }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [activeTab, setActiveTab] = useState<TodoTab>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task input state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Fetch todos
  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await todoApi.getTodos();
      setTodos(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load to-dos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Today string in IST YYYY-MM-DD
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }, []);

  // Filtered lists
  const { todayList, upcomingList, completedList } = useMemo(() => {
    const today: TodoItem[] = [];
    const upcoming: TodoItem[] = [];
    const completed: TodoItem[] = [];

    for (const item of todos) {
      if (item.completed) {
        completed.push(item);
      } else {
        const due = (item.dueDate || '').trim().slice(0, 10);
        if (!due || due <= todayStr) {
          today.push(item);
        } else {
          upcoming.push(item);
        }
      }
    }

    return {
      todayList: today,
      upcomingList: upcoming,
      completedList: completed,
    };
  }, [todos, todayStr]);

  const currentList = useMemo(() => {
    if (activeTab === 'today') return todayList;
    if (activeTab === 'upcoming') return upcomingList;
    return completedList;
  }, [activeTab, todayList, upcomingList, completedList]);

  // Add Task
  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const title = newTitle.trim();
    // Default due date depends on tab if not explicitly picked
    let dueDateToUse = newDueDate.trim() || (activeTab === 'upcoming' ? '' : todayStr);

    setIsSubmitting(true);
    // Optimistic item
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: TodoItem = {
      id: tempId,
      title,
      completed: false,
      dueDate: dueDateToUse || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => [optimisticItem, ...prev]);
    setNewTitle('');
    setNewDueDate('');
    setIsAdding(false);

    try {
      const created = await todoApi.createTodo(title, dueDateToUse || null);
      setTodos((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    } catch {
      // Revert on failure
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      setError('Could not save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Complete
  const handleToggleComplete = async (item: TodoItem) => {
    const nextCompleted = !item.completed;
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t.id === item.id
          ? {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      await todoApi.updateTodo(item.id, { completed: nextCompleted });
    } catch {
      // Revert
      setTodos((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, completed: item.completed } : t))
      );
      setError('Failed to update task status.');
    }
  };

  // Inline Edit Save
  const handleSaveEdit = async (item: TodoItem) => {
    if (!editingText.trim()) {
      setEditingId(null);
      return;
    }
    const updatedTitle = editingText.trim();
    if (updatedTitle === item.title) {
      setEditingId(null);
      return;
    }

    setEditingId(null);
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, title: updatedTitle } : t))
    );

    try {
      await todoApi.updateTodo(item.id, { title: updatedTitle });
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, title: item.title } : t))
      );
      setError('Failed to update task title.');
    }
  };

  // Delete Item
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const backup = todos.find((t) => t.id === id);
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      await todoApi.deleteTodo(id);
    } catch {
      if (backup) setTodos((prev) => [...prev, backup]);
      setError('Failed to delete task.');
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-5 sm:p-6 flex flex-col justify-between shadow-2xs transition-all">
      {/* Top Greeting Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
            Welcome, {userName} 👋
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
            Admin Daily Action Items & Checklist
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#31719B] text-white hover:bg-[#285d80] active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {error && (
        <div className="mt-2.5 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-bold text-red-500 hover:text-red-700 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 mt-3 pt-1">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`pb-2 text-xs font-semibold relative transition-colors cursor-pointer ${
              activeTab === 'today'
                ? 'text-[#31719B] dark:text-[#93c5fd]'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Today ({todayList.length})
            {activeTab === 'today' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`pb-2 text-xs font-semibold relative transition-colors cursor-pointer ${
              activeTab === 'upcoming'
                ? 'text-[#31719B] dark:text-[#93c5fd]'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Upcoming ({upcomingList.length})
            {activeTab === 'upcoming' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`pb-2 text-xs font-semibold relative transition-colors cursor-pointer ${
              activeTab === 'completed'
                ? 'text-[#31719B] dark:text-[#93c5fd]'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Completed ({completedList.length})
            {activeTab === 'completed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#31719B] dark:bg-[#93c5fd] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Inline Add Input Row */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="mt-3 p-2.5 rounded-lg border border-gray-200 dark:border-[#334155] bg-gray-50/70 dark:bg-[#0f172a] flex flex-wrap items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="What needs to be done? Press Enter to save..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[180px] text-xs bg-transparent border-0 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="text-[11px] px-2 py-1 rounded border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#31719B] text-white hover:bg-[#285d80] disabled:opacity-50 transition-all cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List Content Area */}
      <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto scrollbar-slim mt-3 pr-1 space-y-1.5">
        {isLoading ? (
          <div className="h-full flex items-center justify-center py-8 text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin text-[#31719B]" />
            <span className="text-xs">Loading items...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 text-gray-400 dark:text-slate-500 gap-1.5">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#0f172a] flex items-center justify-center text-gray-400">
              <CheckSquare size={16} />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              No tasks in {activeTab}
            </span>
            <span className="text-[11px] text-gray-400">
              Click &quot;Add Task&quot; above to create a to-do item.
            </span>
          </div>
        ) : (
          currentList.map((item) => {
            const isEditing = editingId === item.id;
            const isOverdue =
              !item.completed &&
              item.dueDate &&
              item.dueDate < todayStr;

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-[#334155] hover:bg-gray-50/60 dark:hover:bg-[#162032] transition-all"
              >
                {/* Left: Checkbox + Title */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(item)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      item.completed
                        ? 'bg-[#10b981] border-[#10b981] text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-[#31719B]'
                    }`}
                  >
                    {item.completed && <Check size={11} strokeWidth={3} />}
                  </button>

                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => handleSaveEdit(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 text-xs px-2 py-0.5 rounded border border-[#31719B] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingText(item.title);
                      }}
                      title="Click to edit inline"
                      className={`text-xs cursor-text truncate transition-colors ${
                        item.completed
                          ? 'line-through text-gray-400 dark:text-slate-500'
                          : 'text-gray-800 dark:text-gray-200 hover:text-[#31719B]'
                      }`}
                    >
                      {item.title}
                    </span>
                  )}
                </div>

                {/* Right: Due Date Chip + Delete Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.dueDate && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                        isOverdue
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                          : 'bg-gray-100 dark:bg-[#0f172a] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#334155]'
                      }`}
                    >
                      <Calendar size={10} />
                      {item.dueDate === todayStr ? 'Today' : item.dueDate}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Delete item"
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

