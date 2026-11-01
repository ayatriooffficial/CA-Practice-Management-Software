"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  BadgeCheck,
  CheckCircle2,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { todoApi, AdminTaskItem } from "@/services/todoApi";

interface AdminAdministrativeTasksProps {
  onRefreshSummary?: () => void;
}

export const AdminAdministrativeTasks: React.FC<AdminAdministrativeTasksProps> = ({
  onRefreshSummary,
}) => {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Personal To-Do Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [newCategory, setNewCategory] = useState("Personal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await todoApi.getAdminTasks({
        category: categoryFilter !== "All" ? categoryFilter : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error("Failed to load admin tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggle = async (task: AdminTaskItem) => {
    const nextCompleted = !task.completed;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.dedupKey === task.dedupKey
          ? {
              ...t,
              completed: nextCompleted,
              status: nextCompleted ? "Completed" : t.daysLeft < 0 ? "Expired" : "Pending",
            }
          : t
      )
    );

    try {
      await todoApi.toggleAdminTask(task.dedupKey, nextCompleted);
      onRefreshSummary?.();
    } catch (err) {
      console.error("Failed to toggle admin task:", err);
      // Revert on error
      loadTasks();
    }
  };

  const handleCreatePersonalTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await todoApi.createTodo(newTitle.trim(), newDueDate || null, {
        description: newDescription.trim(),
        priority: newPriority,
        category: newCategory,
      });

      setNewTitle("");
      setNewDescription("");
      setIsAddModalOpen(false);
      loadTasks();
      onRefreshSummary?.();
    } catch (err) {
      console.error("Failed to create personal to-do:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counts
  const counts = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => !t.completed).length;
    const urgent = tasks.filter((t) => !t.completed && (t.priority === "Urgent" || t.status === "Expired")).length;
    const completed = tasks.filter((t) => t.completed).length;
    return { total, pending, urgent, completed };
  }, [tasks]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "DSC":
        return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      case "License":
        return <BadgeCheck className="w-4 h-4 text-blue-500" />;
      case "Document":
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case "Task Review":
        return <Clock className="w-4 h-4 text-purple-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action and filter bar */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deadlines, client, or statutory item..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Categories</option>
            <option value="DSC">DSC Renewals</option>
            <option value="License">License Expiries</option>
            <option value="Document">Pending Documents</option>
            <option value="Task Review">Task Approvals</option>
            <option value="Personal">Personal To-Dos</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Deadlines</option>
            <option value="Urgent / Expired">Urgent / Expired</option>
            <option value="Expiring Soon">Expiring Soon (30d)</option>
            <option value="Completed">Completed / Resolved</option>
          </select>

          {/* Add Personal To-Do Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Personal To-Do</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-subtle text-xs gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Scanning client records, statutory licenses, and deadlines...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="p-12 text-center rounded-xl border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-main">No Administrative Deadlines Found</h3>
          <p className="text-xs text-subtle mt-1 max-w-md mx-auto">
            All DSCs, licenses, statutory files, and pending client deliverables are currently in good standing!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.completed;
            const isExpired = task.status === "Expired" || task.daysLeft < 0;
            const isExpiringSoon = task.status === "Expiring Soon" || (task.daysLeft >= 0 && task.daysLeft <= 15);

            return (
              <div
                key={task.dedupKey}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isCompleted ? "opacity-60 bg-subtle" : "hover:border-primary/50"
                }`}
                style={{
                  backgroundColor: isCompleted ? "var(--bg-subtle)" : "var(--bg-surface)",
                  borderColor: isCompleted
                    ? "var(--border-subtle)"
                    : isExpired
                    ? "#ef4444"
                    : isExpiringSoon
                    ? "#f59e0b"
                    : "var(--border-main)",
                }}
              >
                {/* Left: Checkbox + Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Resolution Toggle Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggle(task)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isCompleted
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "hover:border-primary"
                    }`}
                    style={{
                      borderColor: isCompleted ? undefined : "var(--border-main)",
                    }}
                    title={isCompleted ? "Mark as Pending" : "Mark as Resolved"}
                  >
                    {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Header badges: Category, Priority, Days remaining */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-subtle border text-main" style={{ borderColor: "var(--border-subtle)" }}>
                        {getCategoryIcon(task.category)}
                        <span>{task.category}</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          task.priority === "Urgent"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : task.priority === "High"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Expiry Pill */}
                      {isCompleted ? (
                        <span className="text-[11px] text-emerald-600 font-medium">Resolved</span>
                      ) : isExpired ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Expired {Math.abs(task.daysLeft)} days ago</span>
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expires in {task.daysLeft} days</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-subtle">
                          Due {task.dueDate}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-sm font-semibold leading-snug ${
                        isCompleted ? "line-through text-subtle" : "text-main"
                      }`}
                    >
                      {task.title}
                    </h4>

                    {/* Description */}
                    <p className="text-xs text-subtle mt-0.5 leading-relaxed line-clamp-2">
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Right: Client Pill & Action Link */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-[11px] px-2.5 py-1 rounded-full border bg-subtle text-subtle font-medium truncate max-w-[180px]" style={{ borderColor: "var(--border-subtle)" }}>
                    {task.clientName}
                  </span>

                  {task.actionUrl && (
                    <Link
                      href={task.actionUrl}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors flex items-center gap-1.5 text-main shrink-0"
                      style={{ borderColor: "var(--border-main)" }}
                    >
                      <span>{task.actionLabel || "View"}</span>
                      <ExternalLink className="w-3 h-3 text-subtle" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Personal To-Do Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-xl border relative"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border-main)" }}>
              <h3 className="text-base font-bold text-main">Add Personal To-Do</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePersonalTodo} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1 text-main">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Follow up on advance tax challans"
                  className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
                  style={{ borderColor: "var(--border-main)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-main">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add context or notes..."
                  className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main resize-none"
                  style={{ borderColor: "var(--border-main)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-main">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
                    style={{ borderColor: "var(--border-main)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-main">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
                    style={{ borderColor: "var(--border-main)" }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-main)" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors"
                  style={{ borderColor: "var(--border-main)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {isSubmitting ? "Adding..." : "Save To-Do"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
