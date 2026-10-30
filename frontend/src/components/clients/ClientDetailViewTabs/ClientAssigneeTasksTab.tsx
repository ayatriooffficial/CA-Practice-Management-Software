"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Trash2,
  Calendar,
  Loader2,
  Check,
  Building2,
  X,
} from "lucide-react";
import { Client } from "@/data/crmData";
import { TaskItem } from "@/data/taskData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { taskApi } from "@/services/taskApi";
import { clientApi } from "@/services/clientApi";

export interface ClientAssigneeTasksTabProps {
  client: Client;
  clientTasks?: TaskItem[];
  isLoadingTasks?: boolean;
  onRefreshTasks?: () => void;
  onClientUpdated?: (client: Client) => void;
  showToast?: (msg: string) => void;
}

const getPriorityBadge = (priority?: string) => {
  const norm = (priority || "").toLowerCase();
  if (norm === "urgent" || norm === "critical") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  }
  if (norm === "high") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  }
  if (norm === "medium") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
  return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
};

const getStatusBadge = (status?: string) => {
  const norm = (status || "").toLowerCase();
  if (norm === "completed") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  }
  if (norm === "in progress") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
  if (norm === "sent for review") {
    return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  }
  if (norm === "overdue") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  }
  return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
};

const getInitials = (name?: string): string => {
  if (!name) return "UA";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const ClientAssigneeTasksTab: React.FC<ClientAssigneeTasksTabProps> = ({
  client,
  clientTasks = [],
  isLoadingTasks = false,
  onRefreshTasks,
  onClientUpdated,
  showToast,
}) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");

  // Three-dot popover state
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // Change Assignee Modal state
  const [assigningTask, setAssigningTask] = useState<TaskItem | null>(null);
  const [targetAssigneeId, setTargetAssigneeId] = useState("");
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);

  // Create Task Modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskService, setNewTaskService] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Resizable columns
  const [colWidths, setColWidths] = useState({
    taskName: 200,
    assignee: 220,
    service: 160,
    period: 120,
    dueDate: 120,
    priority: 100,
    status: 120,
    actions: 60,
  });

  const resizingRef = useRef<{
    colKey: keyof typeof colWidths;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Load team members
  useEffect(() => {
    let isMounted = true;
    setEmployees(teamStore.getEmployees());

    teamStore
      .loadEmployeesFromBackend()
      .then((backendList) => {
        if (isMounted && backendList && backendList.length > 0) {
          setEmployees(backendList);
        }
      })
      .catch((err) => console.warn("Failed to load employees:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".task-menu-container")) {
        setActiveMenuTaskId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Column resize mouse drag handlers
  const handleMouseDownResize = (
    e: React.MouseEvent,
    colKey: keyof typeof colWidths
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey],
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaX = moveEvent.clientX - resizingRef.current.startX;
      const nextWidth = Math.max(50, resizingRef.current.startWidth + deltaX);
      setColWidths((prev) => ({
        ...prev,
        [resizingRef.current!.colKey]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Build unified task list
  const combinedTasks = useMemo(() => {
    const list: TaskItem[] = [...clientTasks];
    const existingIds = new Set(list.map((t) => t.id || t.taskId));

    // If client has active service settings with an assignee, surface them if not in clientTasks
    (client.serviceSettings || []).forEach((srv, idx) => {
      const isSrvActive = srv.isActive !== undefined ? Boolean(srv.isActive) : Boolean(srv.compliance);
      if (isSrvActive && srv.serviceName) {
        const syntheticId = `svc-${client.id}-${idx}`;
        const alreadyHasTask = list.some(
          (t) =>
            t.serviceName?.toLowerCase() === srv.serviceName.toLowerCase() ||
            t.taskName?.toLowerCase().includes(srv.serviceName.toLowerCase())
        );

        if (!alreadyHasTask && !existingIds.has(syntheticId)) {
          list.push({
            id: syntheticId,
            taskId: `#SRV0${idx + 1}`,
            taskName: `${srv.serviceName} - Compliance & Filing`,
            clientId: client.id,
            clientName: client.name,
            clientFileNo: client.fileNo || "",
            clientPan: client.pan || "",
            legalName: client.name,
            financialYear: "",
            serviceName: srv.serviceName,
            category: srv.category || "Statutory",
            taskType: "One-Time Task",
            frequency: srv.frequency || "Monthly",
            period: "Current Period",
            assigneeName: srv.assignee || (client.users?.[0] as string) || "Unassigned",
            priority: "Medium",
            status: "Pending",
            startDate: "",
            targetDueDate: srv.target || "Day 15",
            endDate: "",
            billingType: "Non Billable",
            department: srv.category || "Compliance",
            isSprintPlanner: false,
            subTasks: [],
            checklist: [],
            documentRequests: [],
            comments: [],
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return list;
  }, [clientTasks, client.serviceSettings, client.id, client.name, client.users]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return combinedTasks.filter((task) => {
      if (statusFilter !== "All" && task.status !== statusFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.taskName?.toLowerCase().includes(q);
        const matchesAssignee = task.assigneeName?.toLowerCase().includes(q);
        const matchesService = task.serviceName?.toLowerCase().includes(q);
        const matchesTaskId = task.taskId?.toLowerCase().includes(q);
        if (!matchesName && !matchesAssignee && !matchesService && !matchesTaskId) return false;
      }
      return true;
    });
  }, [combinedTasks, statusFilter, priorityFilter, searchQuery]);

  // Status Change Handler
  const handleUpdateStatus = async (task: TaskItem, newStatus: string) => {
    setActiveMenuTaskId(null);
    try {
      if (task.id && !task.id.startsWith("svc-")) {
        await taskApi.updateTask(task.id, { status: newStatus as any });
      }
      showToast?.(`Task status updated to "${newStatus}".`);
      onRefreshTasks?.();
    } catch (err) {
      console.error("Error updating status:", err);
      showToast?.("Failed to update status.");
    }
  };

  // Priority Change Handler
  const handleUpdatePriority = async (task: TaskItem, newPriority: string) => {
    setActiveMenuTaskId(null);
    try {
      if (task.id && !task.id.startsWith("svc-")) {
        await taskApi.updateTask(task.id, { priority: newPriority as any });
      }
      showToast?.(`Task priority updated to "${newPriority}".`);
      onRefreshTasks?.();
    } catch (err) {
      console.error("Error updating priority:", err);
      showToast?.("Failed to update priority.");
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (task: TaskItem) => {
    setActiveMenuTaskId(null);
    if (!confirm(`Are you sure you want to delete task "${task.taskName}"?`)) return;

    try {
      if (task.id && !task.id.startsWith("svc-")) {
        await taskApi.deleteTask(task.id);
        showToast?.("Task deleted successfully.");
        onRefreshTasks?.();
      } else {
        showToast?.("Service task removed from active view.");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      showToast?.("Failed to delete task.");
    }
  };

  // Confirm Assignee Change
  const handleConfirmAssignee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTask || !targetAssigneeId) return;

    const matchedEmp = employees.find((emp) => emp.id === targetAssigneeId);
    const assigneeName = matchedEmp?.name || targetAssigneeId;

    setIsUpdatingAssignee(true);
    try {
      if (assigningTask.id && !assigningTask.id.startsWith("svc-")) {
        await taskApi.updateTask(assigningTask.id, {
          assigneeId: targetAssigneeId,
          assigneeName,
          assigneeInitials: getInitials(assigneeName),
        });
      }

      // Also ensure employee is included in client.users
      const currentUsers = (client.users || []).map(String);
      if (!currentUsers.includes(assigneeName) && !currentUsers.includes(targetAssigneeId)) {
        const updatedUsers = [...currentUsers, assigneeName];
        await clientApi.updateClient(client.id, { users: updatedUsers });
        onClientUpdated?.({ ...client, users: updatedUsers });
      }

      showToast?.(`Assigned "${assigningTask.taskName}" to ${assigneeName}.`);
      setAssigningTask(null);
      setTargetAssigneeId("");
      onRefreshTasks?.();
    } catch (err) {
      console.error("Error reassigning task:", err);
      showToast?.("Failed to reassign task.");
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const matchedEmp = employees.find((emp) => emp.id === newTaskAssigneeId);
    const assigneeName = matchedEmp?.name || "Unassigned";

    setIsCreatingTask(true);
    try {
      await taskApi.createTask({
        taskName: newTaskName.trim(),
        clientId: client.id,
        clientName: client.name,
        clientFileNo: client.fileNo,
        serviceName: newTaskService || "General Services",
        category: newTaskService || "General",
        assigneeId: newTaskAssigneeId || undefined,
        assigneeName,
        assigneeInitials: getInitials(assigneeName),
        priority: newTaskPriority,
        status: "Pending",
        targetDueDate: newTaskDueDate || new Date().toISOString().slice(0, 10),
      });

      showToast?.(`Task "${newTaskName}" created successfully.`);
      setIsCreateTaskModalOpen(false);
      setNewTaskName("");
      setNewTaskService("");
      setNewTaskAssigneeId("");
      setNewTaskDueDate("");
      onRefreshTasks?.();
    } catch (err) {
      console.error("Error creating task:", err);
      showToast?.("Failed to create task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1e293b] p-4 rounded-sm border border-[#dde2e8] dark:border-[#334155] shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks, assignees, services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#31719B]"
          />
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg text-xs">
            {["All", "Pending", "In Progress", "Completed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${statusFilter === st
                  ? "bg-white dark:bg-[#0f172a] text-[#31719B] dark:text-[#60a5fa] shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Add Task Button */}
          <button
            type="button"
            onClick={() => setIsCreateTaskModalOpen(true)}
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            className="px-3.5 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Unified Table Container */}
      <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-[#dde2e8] dark:border-[#334155] shadow-xs overflow-hidden">
        {isLoadingTasks ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
            <span className="text-xs">Loading tasks and assignees...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Building2 className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              No tasks found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Add a new task or adjust your search and filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              {/* Header with Resizable Dividers */}
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-[#dde2e8] dark:border-[#334155]">
                <tr>
                  {/* Task Name - STICKY COLUMN */}
                  <th
                    style={{ width: colWidths.taskName, minWidth: colWidths.taskName }}
                    className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-b border-r border-[#dde2e8] dark:border-[#334155] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Task Name</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "taskName")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Assignee Column */}
                  <th
                    style={{ width: colWidths.assignee, minWidth: colWidths.assignee }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Assignee</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "assignee")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Service / Category Column */}
                  <th
                    style={{ width: colWidths.service, minWidth: colWidths.service }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Service / Category</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "service")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Period Column */}
                  <th
                    style={{ width: colWidths.period, minWidth: colWidths.period }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Period</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "period")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Due Date Column */}
                  <th
                    style={{ width: colWidths.dueDate, minWidth: colWidths.dueDate }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Target Due</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "dueDate")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Priority Column */}
                  <th
                    style={{ width: colWidths.priority, minWidth: colWidths.priority }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Priority</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "priority")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Status Column */}
                  <th
                    style={{ width: colWidths.status, minWidth: colWidths.status }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-4 py-3 font-semibold relative select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, "status")}
                        className="w-1.5 h-full absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-[#31719B] transition-colors"
                        title="Drag to resize column"
                      />
                    </div>
                  </th>

                  {/* Actions Column (3-dot) */}
                  <th
                    style={{ width: colWidths.actions, minWidth: colWidths.actions }}
                    className="border-b border-[#dde2e8] dark:border-[#334155] px-3 py-3 text-center font-semibold"
                  >
                    •••
                  </th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody>
                {filteredTasks.map((task, idx) => {
                  const taskIdStr = task.id || `task-${idx}`;
                  const isMenuOpen = activeMenuTaskId === taskIdStr;

                  return (
                    <tr
                      key={taskIdStr}
                      className="group hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* Task Name - STICKY COLUMN */}
                      <td
                        style={{ width: colWidths.taskName, minWidth: colWidths.taskName }}
                        className="sticky left-0 z-20 bg-white group-hover:bg-blue-50 dark:bg-[#1e293b] dark:group-hover:bg-[#1e293b] border-b border-r border-[#dde2e8] dark:border-[#334155] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] px-4 py-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#31719B] mt-1.5 shrink-0" />
                          <div className="overflow-hidden">
                            <span
                              className="font-bold text-gray-900 dark:text-white block truncate"
                              title={task.taskName}
                            >
                              {task.taskName}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400 block">
                              {task.taskId || `#TSK${idx + 1}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Assignee Cell with Avatar and Quick Switch */}
                      <td
                        style={{ width: colWidths.assignee, minWidth: colWidths.assignee }}
                        className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-[10px] shrink-0"
                              style={{
                                backgroundColor: task.assigneeColor || "var(--premium-blue-dark)",
                              }}
                            >
                              {task.assigneeInitials || getInitials(task.assigneeName)}
                            </div>
                            <div className="overflow-hidden">
                              <span
                                className="font-semibold text-gray-800 dark:text-gray-200 block truncate"
                                title={task.assigneeName}
                              >
                                {task.assigneeName || "Unassigned"}
                              </span>
                              {task.department && (
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {task.department}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Change Assignee Icon */}
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningTask(task);
                              setTargetAssigneeId(task.assigneeId || "");
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#31719B] p-1 rounded transition-opacity cursor-pointer"
                            title="Reassign Task"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Service / Category Cell */}
                      <td
                        style={{ width: colWidths.service, minWidth: colWidths.service }}
                        className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300 block truncate">
                          {task.serviceName || task.category || "General"}
                        </span>
                        {task.frequency && (
                          <span className="text-[10px] text-gray-400 block">
                            {task.frequency}
                          </span>
                        )}
                      </td>

                      {/* Period Cell */}
                      <td
                        style={{ width: colWidths.period, minWidth: colWidths.period }}
                        className="border-b border-gray-100 dark:border-gray-800 px-4 py-3 font-mono text-gray-600 dark:text-gray-400"
                      >
                        {task.period || "Current"}
                      </td>

                      {/* Target Due Date Cell */}
                      <td
                        style={{ width: colWidths.dueDate, minWidth: colWidths.dueDate }}
                        className="border-b border-gray-100 dark:border-gray-800 px-4 py-3 font-mono text-gray-700 dark:text-gray-300"
                      >
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{task.targetDueDate || task.endDate || "-"}</span>
                        </div>
                      </td>

                      {/* Priority Cell */}
                      <td
                        style={{ width: colWidths.priority, minWidth: colWidths.priority }}
                        className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority || "Medium"}
                        </span>
                      </td>

                      {/* Status Cell */}
                      <td
                        style={{ width: colWidths.status, minWidth: colWidths.status }}
                        className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                            task.status
                          )}`}
                        >
                          {task.status || "Pending"}
                        </span>
                      </td>

                      {/* Three-Dot Hover Action Column */}
                      <td
                        style={{ width: colWidths.actions, minWidth: colWidths.actions }}
                        className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-center relative task-menu-container"
                      >
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTaskId(isMenuOpen ? null : taskIdStr);
                            }}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${isMenuOpen
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                              : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            title="Task Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Interactive Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-3 top-10 z-50 w-48 rounded-xl shadow-xl bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] py-1.5 text-xs text-left"
                          >
                            <div className="px-3 py-1 border-b border-gray-100 dark:border-gray-800 font-bold text-[10px] text-gray-400 uppercase tracking-wider">
                              Actions
                            </div>

                            {/* Reassign option */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuTaskId(null);
                                setAssigningTask(task);
                                setTargetAssigneeId(task.assigneeId || "");
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-[#31719B]" />
                              <span>Change Assignee</span>
                            </button>

                            {/* Status sub-options */}
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400">
                              Set Status
                            </div>
                            {["Pending", "In Progress", "Sent for Review", "Completed"].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateStatus(task, st)}
                                className={`w-full text-left px-4 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-[11px] cursor-pointer ${task.status === st
                                  ? "text-[#31719B] dark:text-[#60a5fa] font-bold"
                                  : "text-gray-600 dark:text-gray-400"
                                  }`}
                              >
                                <span>{st}</span>
                                {task.status === st && <Check className="w-3 h-3" />}
                              </button>
                            ))}

                            {/* Priority sub-options */}
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 border-t border-gray-100 dark:border-gray-800 mt-1">
                              Set Priority
                            </div>
                            {["Urgent", "High", "Medium", "Low"].map((pr) => (
                              <button
                                key={pr}
                                type="button"
                                onClick={() => handleUpdatePriority(task, pr)}
                                className={`w-full text-left px-4 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between text-[11px] cursor-pointer ${task.priority === pr
                                  ? "text-[#31719B] dark:text-[#60a5fa] font-bold"
                                  : "text-gray-600 dark:text-gray-400"
                                  }`}
                              >
                                <span>{pr}</span>
                                {task.priority === pr && <Check className="w-3 h-3" />}
                              </button>
                            ))}

                            {/* Delete Option */}
                            <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task)}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Task</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Assignee Modal */}
      {assigningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Change Task Assignee
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                  {assigningTask.taskName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTask(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Team Member
                </label>
                <select
                  value={targetAssigneeId}
                  onChange={(e) => setTargetAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#31719B]"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation || emp.role || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAssigningTask(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetAssigneeId || isUpdatingAssignee}
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  className="px-4 py-1.5 rounded-lg text-white shadow-xs disabled:opacity-50"
                >
                  {isUpdatingAssignee ? "Saving..." : "Save Assignee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Task Modal */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Create Client Task
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Assign a new task to {client.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GSTR-3B Return Filing"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#31719B]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Service / Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. GST Compliance"
                  value={newTaskService}
                  onChange={(e) => setNewTaskService(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#31719B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assignee
                </label>
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#31719B]"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation || emp.role || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 font-semibold">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTaskName.trim() || isCreatingTask}
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  className="px-4 py-1.5 rounded-lg text-white shadow-xs disabled:opacity-50"
                >
                  {isCreatingTask ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
