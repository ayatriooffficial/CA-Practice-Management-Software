"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Filter,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X,
  Loader2,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import { todoApi, TeamTaskItem } from "@/services/todoApi";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { AssignTaskModal } from "./AssignTaskModal";

interface AdminTeamTasksProps {
  onRefreshSummary?: () => void;
}

export const AdminTeamTasks: React.FC<AdminTeamTasksProps> = ({ onRefreshSummary }) => {
  const [tasks, setTasks] = useState<TeamTaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Employees list for dropdown
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  // Assign Task Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Monitor Modal
  const [activeTaskForMonitor, setActiveTaskForMonitor] = useState<TeamTaskItem | null>(null);
  const [reassignId, setReassignId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Load employees
  useEffect(() => {
    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (emps) {
          setEmployees(emps.filter((e) => (e.status || "").toLowerCase() === "active"));
        }
      })
      .catch((err) => console.error("Failed to load employees for filter:", err));
  }, []);

  const loadTeamTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await todoApi.getTeamTasks({
        employeeId: selectedEmployeeId !== "All" ? selectedEmployeeId : undefined,
        status: selectedStatus !== "All" ? selectedStatus : undefined,
        priority: selectedPriority !== "All" ? selectedPriority : undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit: 25,
      });

      setTasks(res.tasks);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Failed to fetch team tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployeeId, selectedStatus, selectedPriority, selectedCategory, searchQuery, page]);

  useEffect(() => {
    loadTeamTasks();
  }, [loadTeamTasks]);

  const openMonitorModal = (task: TeamTaskItem) => {
    setActiveTaskForMonitor(task);
    setReassignId(task.assigneeId || "");
    setNewDueDate(task.targetDueDate || "");
    setUpdateError(null);
  };

  const handleSaveMonitorUpdates = async () => {
    if (!activeTaskForMonitor) return;
    try {
      setIsUpdating(true);
      setUpdateError(null);

      await todoApi.updateTaskProgress(activeTaskForMonitor.taskId, {
        reassignEmployeeId: reassignId !== activeTaskForMonitor.assigneeId ? reassignId : undefined,
        targetDueDate: newDueDate !== activeTaskForMonitor.targetDueDate ? newDueDate : undefined,
      });

      setActiveTaskForMonitor(null);
      loadTeamTasks();
      onRefreshSummary?.();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update task.");
    } finally {
      setIsUpdating(false);
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
      case "Sent for Review":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div
        className="p-4 rounded-xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team tasks, employee, or client..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Filter */}
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Sent for Review">Sent for Review</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Categories</option>
            <option value="General">General</option>
            <option value="Income Tax">Income Tax</option>
            <option value="GST">GST</option>
            <option value="Statutory Audit">Statutory Audit</option>
            <option value="ROC & Compliance">ROC & Compliance</option>
          </select>

          {/* Assign Task Button */}
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Task</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-subtle text-xs gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading team tasks and progress metrics...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="p-12 text-center rounded-xl border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
          <h3 className="text-base font-semibold text-main">No Team Tasks Found</h3>
          <p className="text-xs text-subtle mt-1 max-w-md mx-auto">
            No delegated tasks match the current filter selection. Use the "Assign Task" button to delegate new tasks to team members.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === "Completed";
            const isOverdue = task.isOverdue;

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl border transition-all hover:border-primary/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: isOverdue ? "#ef4444" : "var(--border-main)",
                }}
              >
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

                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadge(task.status)}`}>
                      {task.status}
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

                  <h4 className="text-sm font-bold text-main leading-snug">{task.taskName}</h4>
                  <p className="text-xs text-subtle mt-0.5 truncate max-w-xl">
                    Client: <span className="font-medium text-main">{task.clientName}</span>
                    {task.description ? ` • ${task.description}` : ""}
                  </p>
                </div>

                {/* Middle: Assignee & Progress */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:w-72 shrink-0">
                  {/* Assignee Pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: task.assigneeColor || "#3B82F6" }}
                    >
                      {task.assigneeInitials || task.assigneeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-main truncate max-w-[120px]">
                        {task.assigneeName}
                      </span>
                      <span className="block text-[10px] text-subtle">Assignee</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 w-full min-w-[100px]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-subtle font-medium">Progress</span>
                      <span className="font-bold text-main">{task.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-subtle overflow-hidden">
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
                      <span className="text-[10px] text-subtle mt-0.5 block">
                        {task.checklistCompleted}/{task.checklistTotal} checklist items done
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => openMonitorModal(task)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors flex items-center gap-1.5 text-main"
                    style={{ borderColor: "var(--border-main)" }}
                  >
                    <Sliders className="w-3.5 h-3.5 text-subtle" />
                    <span>Monitor</span>
                  </button>

                  <Link
                    href={`/task/view/${task.taskId}`}
                    className="p-1.5 rounded-lg border text-subtle hover:text-main hover:bg-subtle transition-colors"
                    style={{ borderColor: "var(--border-main)" }}
                    title="Open Full Task Details"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monitor Modal */}
      {activeTaskForMonitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg rounded-xl p-6 shadow-2xl border relative max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: "var(--border-main)" }}>
              <div>
                <span className="text-xs font-mono font-bold text-primary">
                  {activeTaskForMonitor.taskId}
                </span>
                <h3 className="text-base font-bold text-main mt-0.5">{activeTaskForMonitor.taskName}</h3>
                <p className="text-xs text-subtle">Client: {activeTaskForMonitor.clientName}</p>
              </div>
              <button
                onClick={() => setActiveTaskForMonitor(null)}
                className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {updateError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {updateError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              {/* Progress Overview */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>Current Completion</span>
                  <span className="text-primary">{activeTaskForMonitor.progress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-subtle overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${activeTaskForMonitor.progress}%` }}
                  />
                </div>
              </div>

              {/* Checklist Breakdown */}
              <div>
                <label className="block text-xs font-semibold mb-2">
                  Checklist Progress ({activeTaskForMonitor.checklist?.length || 0} items)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(activeTaskForMonitor.checklist || []).length === 0 ? (
                    <p className="text-xs text-subtle italic">No checklist attached to this task.</p>
                  ) : (
                    activeTaskForMonitor.checklist.map((item, i) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg border text-xs"
                        style={{
                          backgroundColor: "var(--bg-subtle)",
                          borderColor: "var(--border-subtle)",
                        }}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                            item.completed
                              ? "bg-emerald-600 text-white"
                              : "border border-gray-400 bg-surface"
                          }`}
                        >
                          {item.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`flex-1 truncate ${item.completed ? "line-through text-subtle" : "text-main"}`}>
                          {item.title}
                        </span>
                        {item.isMandatory && (
                          <span className="text-[10px] font-semibold text-red-600">Mandatory</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Administrative Controls: Reassign Employee & Edit Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: "var(--border-main)" }}>
                <div>
                  <label className="block text-xs font-semibold mb-1">Reassign Employee</label>
                  <select
                    value={reassignId}
                    onChange={(e) => setReassignId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
                    style={{ borderColor: "var(--border-main)" }}
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation || emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
                    style={{ borderColor: "var(--border-main)" }}
                  />
                </div>
              </div>

              {/* Progress Notes History */}
              {activeTaskForMonitor.comments && activeTaskForMonitor.comments.length > 0 && (
                <div className="pt-3 border-t" style={{ borderColor: "var(--border-main)" }}>
                  <label className="block text-xs font-semibold mb-2">Activity & Progress Notes</label>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {activeTaskForMonitor.comments.map((cmt) => (
                      <div
                        key={cmt.id}
                        className="p-2 rounded-lg text-xs border"
                        style={{
                          backgroundColor: "var(--bg-subtle)",
                          borderColor: "var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] text-subtle mb-0.5">
                          <span className="font-semibold text-main">{cmt.authorName}</span>
                          <span>{new Date(cmt.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-subtle">{cmt.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-3 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-main)" }}>
              <button
                type="button"
                onClick={() => setActiveTaskForMonitor(null)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors"
                style={{ borderColor: "var(--border-main)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMonitorUpdates}
                disabled={isUpdating}
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      <AssignTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          loadTeamTasks();
          onRefreshSummary?.();
        }}
      />
    </div>
  );
};
