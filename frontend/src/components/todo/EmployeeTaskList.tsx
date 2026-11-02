"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Send,
  Loader2,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Check,
} from "lucide-react";
import Link from "next/link";
import { todoApi, TeamTaskItem } from "@/services/todoApi";

interface EmployeeTaskListProps {
  onRefreshSummary?: () => void;
}

export const EmployeeTaskList: React.FC<EmployeeTaskListProps> = ({ onRefreshSummary }) => {
  const [tasks, setTasks] = useState<TeamTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Expanded task ID for checklist & note composition
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Note composer per task
  const [noteText, setNoteText] = useState<{ [taskId: string]: string }>({});
  const [isSubmittingNote, setIsSubmittingNote] = useState<{ [taskId: string]: boolean }>({});
  const [actionError, setActionError] = useState<{ [taskId: string]: string | null }>({});

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await todoApi.getMyTasks({
        status: statusFilter !== "All" ? statusFilter : undefined,
        priority: priorityFilter !== "All" ? priorityFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error("Failed to load employee tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Toggle checklist item
  const handleToggleChecklist = async (task: TeamTaskItem, checkItemId: string, currentVal: boolean) => {
    const nextVal = !currentVal;

    // Optimistically update checklist and calculate new progress
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskId !== task.taskId) return t;
        const updatedChecklist = t.checklist.map((c) =>
          c.id === checkItemId ? { ...c, completed: nextVal } : c
        );
        const doneCount = updatedChecklist.filter((c) => c.completed).length;
        const totalCount = updatedChecklist.length;
        const newProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : t.progress;

        return {
          ...t,
          checklist: updatedChecklist,
          checklistCompleted: doneCount,
          progress: newProgress,
          status: newProgress === 100 ? "Completed" : t.status === "Pending" ? "In Progress" : t.status,
        };
      })
    );

    try {
      await todoApi.updateTaskProgress(task.taskId, {
        toggleChecklistId: checkItemId,
        checklistCompleted: nextVal,
      });
      onRefreshSummary?.();
    } catch (err: any) {
      console.error("Failed to toggle checklist:", err);
      loadTasks();
    }
  };

  // Change task status
  const handleStatusChange = async (task: TeamTaskItem, newStatus: string) => {
    setActionError((prev) => ({ ...prev, [task.taskId]: null }));

    // Client-side validation: prevent Completed if mandatory items remain incomplete
    if (newStatus === "Completed") {
      const incompleteMandatory = (task.checklist || []).filter(
        (c) => c.isMandatory && !c.completed
      );
      if (incompleteMandatory.length > 0) {
        setActionError((prev) => ({
          ...prev,
          [task.taskId]: `Cannot mark as Completed: ${incompleteMandatory.length} mandatory checklist item(s) are still pending.`,
        }));
        return;
      }
    }

    try {
      const updated = await todoApi.updateTaskProgress(task.taskId, {
        status: newStatus,
        progress: newStatus === "Completed" ? 100 : task.progress,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === task.taskId
            ? {
                ...t,
                status: newStatus,
                progress: newStatus === "Completed" ? 100 : t.progress,
              }
            : t
        )
      );
      onRefreshSummary?.();
    } catch (err: any) {
      setActionError((prev) => ({
        ...prev,
        [task.taskId]: err.message || "Failed to update status",
      }));
      loadTasks();
    }
  };

  // Update progress slider
  const handleProgressChange = async (task: TeamTaskItem, newProgress: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === task.taskId ? { ...t, progress: newProgress } : t))
    );

    try {
      await todoApi.updateTaskProgress(task.taskId, {
        progress: newProgress,
        status: newProgress === 100 ? "Completed" : task.status === "Pending" ? "In Progress" : task.status,
      });
      onRefreshSummary?.();
    } catch (err) {
      console.error("Failed to update progress:", err);
      loadTasks();
    }
  };

  // Post progress update note
  const handlePostNote = async (taskId: string) => {
    const text = noteText[taskId]?.trim();
    if (!text) return;

    try {
      setIsSubmittingNote((prev) => ({ ...prev, [taskId]: true }));
      setActionError((prev) => ({ ...prev, [taskId]: null }));

      await todoApi.updateTaskProgress(taskId, {
        note: text,
      });

      setNoteText((prev) => ({ ...prev, [taskId]: "" }));
      loadTasks();
    } catch (err: any) {
      setActionError((prev) => ({
        ...prev,
        [taskId]: err.message || "Failed to post update note",
      }));
    } finally {
      setIsSubmittingNote((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
      case "In Progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
      case "On Hold":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div
        className="p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your assigned tasks or client..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-subtle text-xs gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading your assigned tasks...</span>
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
          <h3 className="text-base font-semibold text-main">You&apos;re All Caught Up!</h3>
          <p className="text-xs text-subtle mt-1 max-w-md mx-auto">
            No active tasks are pending for your review or completion. Any new tasks delegated by your manager will appear here immediately.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const isCompleted = task.status === "Completed";
            const isOverdue = task.isOverdue;
            const isExpanded = expandedTaskId === task.taskId;
            const err = actionError[task.taskId];

            return (
              <div
                key={task.id}
                className="rounded-xl border transition-all overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: isOverdue ? "#ef4444" : "var(--border-main)",
                }}
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Left: Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Link
                        href={`/task/view/${task.taskId}`}
                        className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-subtle text-primary hover:underline border"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        {task.taskId}
                      </Link>

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

                      {isOverdue && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Overdue (Due {task.targetDueDate})</span>
                        </span>
                      )}

                      {!isOverdue && task.targetDueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-subtle">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due {task.targetDueDate}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-main leading-snug">{task.taskName}</h3>
                    <p className="text-xs text-subtle mt-0.5">
                      Client: <span className="font-semibold text-main">{task.clientName}</span>
                      {task.description ? ` • ${task.description}` : ""}
                    </p>
                  </div>

                  {/* Middle: Progress Bar */}
                  <div className="md:w-64 shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-subtle font-medium">Progress</span>
                      <span className="font-bold text-main">{task.progress}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-subtle overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.progress === 100
                            ? "bg-emerald-500"
                            : task.progress > 50
                            ? "bg-primary"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    {task.checklistTotal > 0 && (
                      <span className="text-[10px] text-subtle mt-1 block">
                        {task.checklistCompleted} of {task.checklistTotal} checklist items completed
                      </span>
                    )}
                  </div>

                  {/* Right: Status Dropdown & Expand Toggle */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border focus:outline-hidden cursor-pointer ${getStatusBadge(
                        task.status
                      )}`}
                      style={{ borderColor: "var(--border-main)" }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTaskId(isExpanded ? null : task.taskId)
                      }
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors flex items-center gap-1.5 text-main"
                      style={{ borderColor: "var(--border-main)" }}
                    >
                      <span>{isExpanded ? "Hide Details" : "Work on Task"}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-subtle transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {err && (
                  <div className="px-5 py-2 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{err}</span>
                  </div>
                )}

                {/* Expanded Section: Checklist, Progress Controls, Notes */}
                {isExpanded && (
                  <div
                    className="p-5 border-t space-y-4"
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      borderColor: "var(--border-main)",
                    }}
                  >
                    {/* Checklist Interactive Toggles */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-subtle mb-2.5">
                        Deliverable Checklist ({task.checklistTotal} steps)
                      </h4>

                      {task.checklistTotal === 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-subtle italic">
                            No checklist configured. Use the progress slider below to record completion percentage.
                          </p>
                          <div className="flex items-center gap-3 max-w-sm">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={task.progress}
                              onChange={(e) => handleProgressChange(task, Number(e.target.value))}
                              className="w-full accent-primary cursor-pointer"
                            />
                            <span className="text-xs font-bold min-w-[40px] text-main">
                              {task.progress}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {task.checklist.map((item, idx) => (
                            <label
                              key={item.id}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                                item.completed
                                  ? "bg-surface/50 border-emerald-200 dark:border-emerald-900"
                                  : "bg-surface hover:border-primary/50"
                              }`}
                              style={{ borderColor: item.completed ? undefined : "var(--border-main)" }}
                            >
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklist(task, item.id, item.completed)}
                                className="mt-0.5 rounded text-primary focus:ring-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-xs font-medium block leading-snug ${
                                    item.completed ? "line-through text-subtle" : "text-main"
                                  }`}
                                >
                                  {idx + 1}. {item.title}
                                </span>
                              </div>
                              {item.isMandatory && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 shrink-0">
                                  Mandatory
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Progress Notes & Comments History */}
                    <div className="pt-3 border-t" style={{ borderColor: "var(--border-main)" }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-subtle mb-2">
                        Post Progress Update / Note
                      </h4>

                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={noteText[task.taskId] || ""}
                          onChange={(e) =>
                            setNoteText((prev) => ({ ...prev, [task.taskId]: e.target.value }))
                          }
                          placeholder="Log notes, client submission details, or work completed..."
                          className="flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main resize-none"
                          style={{ borderColor: "var(--border-main)" }}
                        />
                        <button
                          type="button"
                          onClick={() => handlePostNote(task.taskId)}
                          disabled={isSubmittingNote[task.taskId] || !noteText[task.taskId]?.trim()}
                          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 self-end shrink-0 disabled:opacity-50"
                        >
                          {isSubmittingNote[task.taskId] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Post Note</span>
                        </button>
                      </div>

                      {/* Previous Comments */}
                      {task.comments && task.comments.length > 0 && (
                        <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
                          {task.comments.map((c) => (
                            <div
                              key={c.id}
                              className="p-2 rounded-lg bg-surface border text-xs"
                              style={{ borderColor: "var(--border-subtle)" }}
                            >
                              <div className="flex items-center justify-between text-[10px] text-subtle mb-0.5">
                                <span className="font-semibold text-main">{c.authorName}</span>
                                <span>{new Date(c.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-subtle">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
