"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Calendar,
  Plus,
  Search,
  ChevronDown,
  ArrowDownUp,
  MoreVertical,
  Loader2,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { todoApi, TeamTaskItem, TodoSummary } from "@/services/todoApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { TuriaTodoSidebar, TuriaNavSection, TuriaSidebarCounts } from "./TuriaTodoSidebar";
import { TuriaRightRail } from "./TuriaRightRail";
import { TuriaEmptyState } from "./TuriaEmptyState";
import { TuriaDateTaskView } from "./TuriaDateTaskView";
import { TuriaAddTodoModal } from "./TuriaAddTodoModal";
import { TodoCalendarView } from "./TodoCalendarView";
import {
  parseDateToYMD,
  getTodayKolkataYMD,
  getTomorrowKolkataYMD,
  formatFriendlyDate,
} from "./todoDateUtils";

interface TuriaTodoWorkspaceProps {
  userName?: string;
  defaultCalendarView?: boolean;
}

export const TuriaTodoWorkspace: React.FC<TuriaTodoWorkspaceProps> = ({
  userName,
  defaultCalendarView = false,
}) => {
  const { currentUser } = useAuth();
  const role = (currentUser?.role || "employee").toLowerCase().trim();
  const isAdmin = ["admin", "owner", "partner", "manager"].includes(role);
  const searchParams = useSearchParams();
  const viewQuery = searchParams?.get("view");

  // Layout State
  const [activeSection, setActiveSection] = useState<TuriaNavSection>("my-todo");
  const [adminScope, setAdminScope] = useState<"my_work" | "team_work" | "all_work">("my_work");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCalendarView, setIsCalendarView] = useState(
    () => defaultCalendarView || viewQuery === "calendar"
  );
  const [dateFilterTab, setDateFilterTab] = useState<"all" | "today" | "tomorrow" | "upcoming" | "overdue">("all");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("All");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("All");
  const [sortBy, setSortBy] = useState<"created-desc" | "created-asc" | "due-asc" | "priority-desc">("created-desc");
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Data State
  const [rawTasks, setRawTasks] = useState<TeamTaskItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load clients and employees
  useEffect(() => {
    clientApi
      .getClients({ page: 1, limit: 100 })
      .then((res) => {
        if (res.data) setClients(res.data);
      })
      .catch((err) => console.error("Error loading clients:", err));

    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (emps) {
          const active = emps.filter((e) => (e.status || "").toLowerCase() === "active");
          setEmployees(active);
        }
      })
      .catch((err) => console.error("Error loading employees:", err));
  }, []);

  // Fetch tasks
  const loadTasks = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      if (isAdmin) {
        const [teamRes, adminRes] = await Promise.all([
          todoApi.getTeamTasks({ limit: 100 }).catch(() => ({ tasks: [], total: 0 })),
          todoApi.getAdminTasks().catch(() => []),
        ]);

        const mappedAdminTasks: TeamTaskItem[] = (adminRes || []).map((at) => ({
          id: at.dedupKey || at.id,
          taskId: at.sourceId || at.id,
          taskName: at.title,
          description: at.description,
          category: at.category,
          clientName: at.clientName,
          clientId: at.clientId,
          assigneeId: currentUser?.id || "admin",
          assigneeName: "Ayatrio Admin",
          assigneeInitials: "AY",
          assigneeColor: "#6366F1",
          priority: at.priority,
          status: at.completed ? "Completed" : at.status === "Expired" ? "Overdue" : "Pending",
          startDate: at.createdAt ? at.createdAt.slice(0, 10) : "",
          targetDueDate: at.dueDate,
          progress: at.completed ? 100 : 0,
          checklistTotal: 1,
          checklistCompleted: at.completed ? 1 : 0,
          checklist: [
            {
              id: `chk_${at.id}`,
              title: at.actionLabel || "Review and resolve obligation",
              completed: at.completed,
              isMandatory: true,
            },
          ],
          isOverdue: !at.completed && (at.daysLeft < 0 || at.status === "Expired"),
          daysLeft: at.daysLeft,
          createdAt: at.createdAt,
          updatedAt: at.updatedAt,
          actionUrl: at.actionUrl,
          isAdministrative: true,
        }));

        const seenIds = new Set<string>();
        const merged: TeamTaskItem[] = [];

        for (const item of mappedAdminTasks) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            merged.push(item);
          }
        }

        for (const item of (teamRes.tasks || [])) {
          const assignedKey = `admin:assigned_task:${item.taskId}`;
          if (!seenIds.has(item.id) && !seenIds.has(item.taskId) && !seenIds.has(assignedKey)) {
            seenIds.add(item.id);
            merged.push(item);
          }
        }

        setRawTasks(merged);
      } else {
        const myTasks = await todoApi.getMyTasks();
        setRawTasks(myTasks || []);
      }
    } catch (err) {
      console.error("Failed to load to-do tasks:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin, currentUser]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Scope counts for Admin: My Work vs Team Work vs All Work
  const scopeCounts = useMemo(() => {
    let myWork = 0;
    let teamWork = 0;
    let allWork = 0;

    rawTasks.forEach((t) => {
      const isDone = (t.status || "").toLowerCase() === "completed";
      if (!isDone) {
        allWork++;
        const isMine =
          (t as any).isAdministrative ||
          t.assigneeId === currentUser?.id ||
          t.assigneeName === currentUser?.name ||
          t.assigneeName?.toLowerCase().includes("admin") ||
          t.category === "Personal";

        if (isMine) {
          myWork++;
        } else {
          teamWork++;
        }
      }
    });

    return { myWork, teamWork, allWork };
  }, [rawTasks, currentUser]);

  // Calculate sidebar counts
  const sidebarCounts: TuriaSidebarCounts = useMemo(() => {
    let myTodo = 0;
    let important = 0;
    let recurring = 0;
    let completed = 0;
    let deleted = 0;

    rawTasks.forEach((t) => {
      const isDone = (t.status || "").toLowerCase() === "completed";
      const isImp = t.priority === "Urgent" || t.priority === "High";
      const isRec = Boolean(t.category?.toLowerCase().includes("recurring") || t.taskName?.toLowerCase().includes("recurring"));

      if (isDone) {
        completed++;
      } else {
        if (!isAdmin) {
          myTodo++;
          if (isImp) important++;
          if (isRec) recurring++;
        } else {
          const isMine =
            (t as any).isAdministrative ||
            t.assigneeId === currentUser?.id ||
            t.assigneeName === currentUser?.name ||
            t.assigneeName?.toLowerCase().includes("admin") ||
            t.category === "Personal";

          if (adminScope === "my_work" && isMine) {
            myTodo++;
          } else if (adminScope === "team_work" && !isMine) {
            myTodo++;
          } else if (adminScope === "all_work") {
            myTodo++;
          }

          if (isImp) important++;
          if (isRec) recurring++;
        }
      }
    });

    return { myTodo, important, recurring, completed, deleted };
  }, [rawTasks, isAdmin, currentUser, adminScope]);

  // Filter tasks based on all active criteria
  const filteredTasks = useMemo(() => {
    let list = [...rawTasks];

    // 1. Sidebar Section filter
    if (activeSection === "completed") {
      list = list.filter((t) => (t.status || "").toLowerCase() === "completed");
    } else if (activeSection === "deleted") {
      list = list.filter((t) => (t.status || "").toLowerCase() === "cancelled" || (t.status || "").toLowerCase() === "deleted");
    } else {
      // In my-todo, important, recurring: exclude completed by default
      list = list.filter((t) => (t.status || "").toLowerCase() !== "completed");

      if (activeSection === "important") {
        list = list.filter((t) => t.priority === "Urgent" || t.priority === "High");
      } else if (activeSection === "recurring") {
        list = list.filter((t) =>
          Boolean(t.category?.toLowerCase().includes("recurring") || t.taskName?.toLowerCase().includes("recurring"))
        );
      } else if (activeSection === "my-todo") {
        if (!isAdmin) {
          // Employee sees their own tasks and personal to-dos
          list = list.filter(
            (t) =>
              t.assigneeId === currentUser?.id ||
              t.assigneeName === currentUser?.name ||
              t.category === "Personal"
          );
        } else {
          // Admin filters by scope
          if (adminScope === "my_work") {
            list = list.filter(
              (t) =>
                (t as any).isAdministrative ||
                t.assigneeId === currentUser?.id ||
                t.assigneeName === currentUser?.name ||
                t.assigneeName?.toLowerCase().includes("admin") ||
                t.category === "Personal"
            );
          } else if (adminScope === "team_work") {
            list = list.filter(
              (t) =>
                !(t as any).isAdministrative &&
                t.assigneeId !== currentUser?.id &&
                !t.assigneeName?.toLowerCase().includes("admin") &&
                t.category !== "Personal"
            );
          }
          // if "all_work", list remains all active tasks
        }
      }
    }

    // 2. Tag filter
    if (selectedTag) {
      list = list.filter(
        (t) => (t.category || "").toLowerCase() === selectedTag.toLowerCase()
      );
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.taskName?.toLowerCase().includes(q) ||
          t.clientName?.toLowerCase().includes(q) ||
          t.taskId?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q)
      );
    }

    // 4. Client filter
    if (selectedClientId !== "All") {
      list = list.filter(
        (t) => t.clientId === selectedClientId || t.clientName === selectedClientId
      );
    }

    // 5. Assignee filter (for Admin)
    if (selectedAssigneeId !== "All") {
      list = list.filter(
        (t) =>
          t.assigneeId === selectedAssigneeId ||
          t.assigneeName?.toLowerCase().trim() === selectedAssigneeId.toLowerCase().trim()
      );
    }

    // 6. Specific due date filter (from Filter by due date button)
    if (dueDateFilter) {
      list = list.filter((t) => parseDateToYMD(t.targetDueDate) === dueDateFilter);
    }

    // 7. Sort
    list.sort((a, b) => {
      if (sortBy === "due-asc") {
        const da = parseDateToYMD(a.targetDueDate) || "9999-99-99";
        const db = parseDateToYMD(b.targetDueDate) || "9999-99-99";
        return da.localeCompare(db);
      }
      if (sortBy === "priority-desc") {
        const score = (p: string) => (p === "Urgent" ? 4 : p === "High" ? 3 : p === "Medium" ? 2 : 1);
        return score(b.priority) - score(a.priority);
      }
      if (sortBy === "created-asc") {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      }
      // default: created-desc
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return list;
  }, [
    rawTasks,
    activeSection,
    adminScope,
    selectedTag,
    searchQuery,
    selectedClientId,
    selectedAssigneeId,
    dueDateFilter,
    sortBy,
    isAdmin,
    currentUser,
  ]);

  // Handlers
  const handleToggleChecklist = async (
    taskId: string,
    checklistId: string,
    currentCompleted: boolean
  ) => {
    try {
      if (taskId.startsWith("admin:")) {
        await todoApi.toggleAdminTask(taskId, !currentCompleted);
      } else {
        await todoApi.updateTaskProgress(taskId, {
          toggleChecklistId: checklistId,
          checklistCompleted: !currentCompleted,
        });
      }
      loadTasks(true);
    } catch (err) {
      console.error("Failed to update checklist step:", err);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      if (taskId.startsWith("admin:")) {
        await todoApi.toggleAdminTask(taskId, newStatus === "Completed");
      } else {
        await todoApi.updateTaskProgress(taskId, {
          status: newStatus,
          progress: newStatus === "Completed" ? 100 : undefined,
        });
      }
      loadTasks(true);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleToggleCompleteTask = async (task: TeamTaskItem) => {
    const isCurrentlyDone = (task.status || "").toLowerCase() === "completed";
    const nextStatus = isCurrentlyDone ? "Pending" : "Completed";
    const nextProgress = isCurrentlyDone ? 0 : 100;

    try {
      if ((task as any).isAdministrative || task.id.startsWith("admin:") || (task as any).sourceType === "dsc" || (task as any).sourceType === "license" || (task as any).sourceType === "document") {
        await todoApi.toggleAdminTask(task.id, !isCurrentlyDone);
      } else {
        await todoApi.updateTaskProgress(task.id, {
          status: nextStatus,
          progress: nextProgress,
        });
      }
      loadTasks(true);
    } catch (err) {
      console.error("Failed to toggle completion:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this To-Do task?")) return;
    try {
      await todoApi.updateTaskProgress(taskId, {
        status: "Cancelled",
      });
      loadTasks(true);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleStarTask = async (taskId: string) => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextPriority = task.priority === "High" || task.priority === "Urgent" ? "Medium" : "High";

    try {
      await todoApi.updateTaskProgress(taskId, {
        note: `Priority changed to ${nextPriority}`,
      });
      loadTasks(true);
    } catch (err) {
      console.error("Failed to star task:", err);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-var(--header-height))] flex overflow-hidden bg-white dark:bg-background select-none">
      {isCalendarView ? (
        /* Full-Page Notices-Style To-Do Calendar Experience (Requirement 6!) */
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
          <TodoCalendarView
            initialEmployeeFilter={selectedAssigneeId}
            isAdmin={isAdmin}
            adminScope={adminScope}
            onScopeChange={setAdminScope}
            onSwitchToList={() => setIsCalendarView(false)}
            onAddTodo={(dateStr) => {
              if (dateStr) setDueDateFilter(dateStr);
              setIsAddModalOpen(true);
            }}
          />
        </div>
      ) : (
        <>
          {/* 1. Left Secondary Navigation Panel (Turia To-Do Sidebar) */}
          <TuriaTodoSidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          setIsCalendarView(false);
        }}
        counts={sidebarCounts}
        selectedTag={selectedTag}
        onSelectTag={(tag) => {
          setSelectedTag(tag);
          setIsCalendarView(false);
        }}
        onAddTagClick={() => setIsAddModalOpen(true)}
      />

      {/* 2. Center Main To-Do Workspace */}
      <main className="flex-1 min-w-0 flex flex-col h-full bg-[#FAFAFC] dark:bg-background/80 overflow-y-auto">
        {/* Top Header Row */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-4">
          {/* Left Title with Square Checkbox Icon */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
              <CheckSquare className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>To-Do Manager</span>
                {isRefreshing && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
                )}
              </h1>
            </div>
          </div>

          {/* Right Toolbar: Filter by due date + Add To-Do */}
          <div className="flex items-center gap-2.5">
            {/* Filter by due date button / popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker((prev) => !prev)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-2 transition-colors cursor-pointer ${
                  dueDateFilter
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-semibold"
                    : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>
                  {dueDateFilter
                    ? `Due: ${formatFriendlyDate(dueDateFilter)}`
                    : "Filter by due date"}
                </span>
                {dueDateFilter && (
                  <X
                    className="w-3 h-3 text-indigo-500 hover:text-indigo-700 ml-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDueDateFilter(null);
                    }}
                  />
                )}
              </button>

              {/* Date Filter Dropdown Popover */}
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-card rounded-xl shadow-xl border border-gray-200 dark:border-border p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Quick Date Select
                  </div>
                  <div className="space-y-1 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDueDateFilter(getTodayKolkataYMD());
                        setShowDatePicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Today ({formatFriendlyDate(getTodayKolkataYMD())})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDueDateFilter(getTomorrowKolkataYMD());
                        setShowDatePicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Tomorrow ({formatFriendlyDate(getTomorrowKolkataYMD())})
                    </button>
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-border/60">
                    <label className="block text-[11px] text-gray-500 mb-1">
                      Or pick custom date:
                    </label>
                    <input
                      type="date"
                      value={dueDateFilter || ""}
                      onChange={(e) => {
                        setDueDateFilter(e.target.value || null);
                        setShowDatePicker(false);
                      }}
                      className="w-full px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* + Add To-Do Primary Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#5B50E5] hover:bg-[#4E43D8] rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Add To-Do</span>
            </button>
          </div>
        </div>

        {/* Second Line: Compact Filter Toolbar matching Turia */}
        <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search to-dos..."
              className="w-64 sm:w-80 h-9 px-3 pl-9 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Client Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="All">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name || c.legalName}>
                  {c.name || c.legalName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Assignee Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              disabled={!isAdmin}
              className={`h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none ${
                !isAdmin ? "cursor-default opacity-90" : "cursor-pointer"
              }`}
            >
              {isAdmin ? (
                <>
                  <option value="All">All Assignees</option>
                  <option value={currentUser?.name || "Ayatrio Admin"}>
                    {currentUser?.name || "Ayatrio Admin"} (Me)
                  </option>
                  {employees
                    .filter((emp) => emp.name !== currentUser?.name)
                    .map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                </>
              ) : (
                <option value={currentUser?.name || "Me"}>
                  {currentUser?.name || "My Assigned Tasks"}
                </option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort Button / Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="created-desc">Created On ↓</option>
              <option value="created-asc">Created On ↑</option>
              <option value="due-asc">Due Date (Earliest)</option>
              <option value="priority-desc">Priority (Highest)</option>
            </select>
            <ArrowDownUp className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Action Menu ⋮ matching Turia reference */}
          <button
            type="button"
            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Calendar view toggle button */}
          <div className="relative ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setIsCalendarView(true)}
              className="h-9 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-gray-300 hover:bg-gray-50"
              title="Open Full-Page Notices-Style Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar</span>
            </button>
          </div>
        </div>

        {/* 3. Main Content Container matching Turia reference */}
        <div className="mx-6 mb-6 rounded-2xl border border-gray-200/90 dark:border-border bg-white dark:bg-card shadow-xs flex-1 flex flex-col p-6 min-h-[500px] overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Loading to-do manager...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            /* Empty State Matching Turia Illustration */
            <TuriaEmptyState
              onAddTodo={() => setIsAddModalOpen(true)}
              title={
                searchQuery || selectedClientId !== "All" || selectedAssigneeId !== "All"
                  ? "No Matching Tasks Found"
                  : "Ready to Tackle Your Day?"
              }
              subtitle={
                searchQuery || selectedClientId !== "All" || selectedAssigneeId !== "All"
                  ? "Try resetting filters or searching for something else."
                  : "Click 'Add To-Do' to create your first task and get organized!"
              }
            />
          ) : (
            /* Date-Wise Daily Task View (Requirement 2!) */
            <div className="flex-1 overflow-y-auto pr-1">
              <TuriaDateTaskView
                tasks={filteredTasks}
                isAdmin={isAdmin}
                onToggleChecklist={handleToggleChecklist}
                onUpdateStatus={handleUpdateStatus}
                onToggleCompleteTask={handleToggleCompleteTask}
                onDeleteTask={handleDeleteTask}
                onStarTask={handleStarTask}
                activeFilterTab={dateFilterTab}
                onTabChange={setDateFilterTab}
                adminScope={adminScope}
                onScopeChange={setAdminScope}
                scopeCounts={scopeCounts}
              />
            </div>
          )}
        </div>
      </main>

      {/* 3. Right Utility Rail */}
      <TuriaRightRail
        onToggleCalendar={() => setIsCalendarView(true)}
        isCalendarActive={false}
      />
    </>
  )}

      {/* 4. Add / Assign To-Do Modal (Requirement 1!) */}
      <TuriaAddTodoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadTasks(false)}
        isAdmin={isAdmin}
        currentUserId={currentUser?.id}
        currentUserName={currentUser?.name}
        defaultDate={dueDateFilter || undefined}
      />
    </div>
  );
};
