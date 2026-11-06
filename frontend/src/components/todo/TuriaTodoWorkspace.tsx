"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  X,
  RefreshCw,
  Inbox,
  Star,
  Repeat,
  Trash2,
  Check,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { todoApi, TeamTaskItem } from "@/services/todoApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { TuriaNavSection, TuriaSidebarCounts } from "./TuriaTodoSidebar";
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

const DEFAULT_TAGS = [
  "General",
  "GST",
  "Income Tax",
  "Audit",
  "Compliance",
  "ROC",
  "Personal",
];

const TAG_DOT_COLORS: Record<string, string> = {
  General: "bg-slate-400",
  GST: "bg-emerald-500",
  "Income Tax": "bg-blue-500",
  Audit: "bg-purple-500",
  Compliance: "bg-amber-500",
  ROC: "bg-rose-500",
  Personal: "bg-pink-500",
};

interface TaskViewOption {
  id: TuriaNavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isSecondary?: boolean;
}

const TASK_VIEW_OPTIONS: TaskViewOption[] = [
  {
    id: "my-todo",
    label: "All",
    icon: Inbox,
    description: "Display all applicable tasks",
  },
  {
    id: "important",
    label: "Important",
    icon: Star,
    description: "Display tasks marked as important",
  },
  {
    id: "completed",
    label: "Finished",
    icon: CheckSquare,
    description: "Display completed tasks",
  },
  {
    id: "recurring",
    label: "Recurring Master",
    icon: Repeat,
    description: "Recurring task templates",
    isSecondary: true,
  },
  {
    id: "deleted",
    label: "Deleted",
    icon: Trash2,
    description: "Cancelled and deleted tasks",
    isSecondary: true,
  },
];

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

  // Dropdown States & Refs
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        viewDropdownRef.current &&
        !viewDropdownRef.current.contains(event.target as Node)
      ) {
        setIsViewDropdownOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsViewDropdownOpen(false);
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("All");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("All");
  const [sortBy, setSortBy] = useState<"created-desc" | "created-asc" | "due-asc" | "priority-desc">("created-desc");
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => {
    const act = searchParams?.get("action");
    const op = searchParams?.get("open");
    const cr = searchParams?.get("create");
    return act === "new" || op === "create" || cr === "true";
  });

  useEffect(() => {
    const act = searchParams?.get("action");
    const op = searchParams?.get("open");
    const cr = searchParams?.get("create");
    if (act === "new" || op === "create" || cr === "true") {
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

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

  // Calculate counts for task views
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

    // 1. Task-view filter
    if (activeSection === "completed") {
      list = list.filter((t) => (t.status || "").toLowerCase() === "completed");
    } else if (activeSection === "deleted") {
      list = list.filter((t) => (t.status || "").toLowerCase() === "cancelled" || (t.status || "").toLowerCase() === "deleted");
    } else {
      // In my-todo (All), important, recurring: exclude completed by default
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

  // Active view information
  const currentViewConfig =
    TASK_VIEW_OPTIONS.find((opt) => opt.id === activeSection) || TASK_VIEW_OPTIONS[0];

  const currentViewCount =
    activeSection === "my-todo"
      ? sidebarCounts.myTodo
      : activeSection === "important"
      ? sidebarCounts.important
      : activeSection === "completed"
      ? sidebarCounts.completed
      : activeSection === "recurring"
      ? sidebarCounts.recurring
      : sidebarCounts.deleted;

  const ViewIcon = currentViewConfig.icon;

  return (
    <div
      className="w-full h-[calc(100vh-var(--header-height))] flex overflow-hidden select-none"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {isCalendarView ? (
        /* Full-Page Notices-Style To-Do Calendar Experience */
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
          {/* Main Full-Width Content Column */}
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            {/* 1. TOP HORIZONTAL CATEGORY & TAG NAVIGATION ROW (Compliance Style) */}
            <div
              className="px-4 sm:px-6 py-2.5 border-b flex items-center gap-2.5 sm:gap-3 shrink-0"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
              }}
            >
              {/* Task-View Dropdown (All / Important / Finished / Recurring Master / Deleted) */}
              <div className="relative shrink-0" ref={viewDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsViewDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: isViewDropdownOpen ? "var(--primary)" : "var(--border-main)",
                    color: "var(--text-main)",
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={isViewDropdownOpen}
                  title="Select Task View"
                >
                  <ViewIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeSection === "important"
                        ? "text-amber-500 fill-amber-400"
                        : activeSection === "completed"
                        ? "text-emerald-600"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  />
                  <span>{currentViewConfig.label}</span>
                  <span
                    className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {currentViewCount}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                      isViewDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isViewDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-1.5 w-60 sm:w-64 rounded-xl border p-1.5 z-50 shadow-lg animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-main)",
                    }}
                    role="listbox"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Task Views
                    </div>
                    {/* Primary Views: All, Important, Finished */}
                    {TASK_VIEW_OPTIONS.filter((opt) => !opt.isSecondary).map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = activeSection === opt.id;
                      const count =
                        opt.id === "my-todo"
                          ? sidebarCounts.myTodo
                          : opt.id === "important"
                          ? sidebarCounts.important
                          : sidebarCounts.completed;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(opt.id);
                            setIsViewDropdownOpen(false);
                            setIsCalendarView(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? "bg-slate-100 dark:bg-slate-800 font-semibold text-[#31719B] dark:text-[#60A5FA]"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                opt.id === "important"
                                  ? "text-amber-500 fill-amber-400"
                                  : opt.id === "completed"
                                  ? "text-emerald-600"
                                  : "text-slate-500"
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold">{opt.label}</div>
                              <div className="text-[10px] text-slate-400 truncate">{opt.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[11px] font-medium text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              {count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#31719B] dark:text-[#60A5FA]" />}
                          </div>
                        </button>
                      );
                    })}

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Management
                    </div>

                    {/* Secondary Views: Recurring Master, Deleted */}
                    {TASK_VIEW_OPTIONS.filter((opt) => opt.isSecondary).map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = activeSection === opt.id;
                      const count =
                        opt.id === "recurring"
                          ? sidebarCounts.recurring
                          : sidebarCounts.deleted;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(opt.id);
                            setIsViewDropdownOpen(false);
                            setIsCalendarView(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? "bg-slate-100 dark:bg-slate-800 font-semibold text-[#31719B] dark:text-[#60A5FA]"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <div className="font-semibold">{opt.label}</div>
                              <div className="text-[10px] text-slate-400 truncate">{opt.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[11px] font-medium text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              {count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#31719B] dark:text-[#60A5FA]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />

              {/* Horizontal Tag Pills (Scrollable with smooth touch/drag support) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar snap-x py-0.5">
                {/* All Tags Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(null);
                    setIsCalendarView(false);
                  }}
                  className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap border shrink-0 snap-start ${
                    selectedTag === null
                      ? "font-semibold shadow-xs"
                      : "hover:border-slate-400 dark:hover:border-slate-500 font-medium"
                  }`}
                  style={{
                    backgroundColor: selectedTag === null ? "var(--primary)" : "var(--bg-surface)",
                    borderColor: selectedTag === null ? "var(--primary)" : "var(--border-main)",
                    color: selectedTag === null ? "var(--text-inverse)" : "var(--text-main)",
                  }}
                >
                  <span>All Tags</span>
                </button>

                {/* Individual Tag Pills */}
                {DEFAULT_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag;
                  const dotColor = TAG_DOT_COLORS[tag] || "bg-slate-400";

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(isSelected ? null : tag);
                        setIsCalendarView(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap border shrink-0 snap-start ${
                        isSelected
                          ? "font-semibold shadow-xs"
                          : "hover:border-slate-400 dark:hover:border-slate-500 font-medium"
                      }`}
                      style={{
                        backgroundColor: isSelected ? "var(--primary)" : "var(--bg-surface)",
                        borderColor: isSelected ? "var(--primary)" : "var(--border-main)",
                        color: isSelected ? "var(--text-inverse)" : "var(--text-main)",
                      }}
                      title={`Filter by ${tag}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? "bg-white" : dotColor
                        }`}
                      />
                      <span>{tag}</span>
                      {isSelected && (
                        <X className="w-3 h-3 text-white/80 hover:text-white ml-0.5" />
                      )}
                    </button>
                  );
                })}

                {/* Add Tag / Add Task (+) Button */}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="p-1.5 rounded-full border transition-colors cursor-pointer shrink-0 snap-start hover:border-slate-400 dark:hover:border-slate-500"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                    color: "var(--text-muted)",
                  }}
                  title="Add or manage tags"
                  aria-label="Add or manage tags"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. HEADER ROW: Heading + Primary Action Buttons */}
            <div
              className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center justify-between gap-3 shrink-0"
              style={{
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shadow-2xs shrink-0">
                  <CheckSquare className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>To-Do Manager</span>
                    {isRefreshing && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    )}
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">
                    {activeSection === "completed"
                      ? "Viewing finished tasks"
                      : activeSection === "important"
                      ? "Viewing high & urgent priority tasks"
                      : activeSection === "recurring"
                      ? "Viewing recurring master templates"
                      : activeSection === "deleted"
                      ? "Viewing archived & deleted tasks"
                      : "Viewing all applicable tasks"}
                    {selectedTag ? ` · Tag: ${selectedTag}` : ""}
                    {` (${filteredTasks.length} ${filteredTasks.length === 1 ? "task" : "tasks"})`}
                  </p>
                </div>
              </div>

              {/* Right: Actions (Filter by due date, Calendar, + Add To-Do) */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

                {/* Calendar button */}
                <button
                  type="button"
                  onClick={() => setIsCalendarView(true)}
                  className="h-8 sm:h-9 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer bg-white dark:bg-card border-gray-200 dark:border-border text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-2xs"
                  title="Open Full-Page Notices-Style Calendar"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Calendar</span>
                </button>

                {/* + Add To-Do Primary Button */}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="h-8 sm:h-9 px-4 text-xs font-semibold text-white bg-[#5B50E5] hover:bg-[#4E43D8] rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>+ Add To-Do</span>
                </button>
              </div>
            </div>

            {/* 3. FILTERS & SEARCH TOOLBAR ROW (Compliance Style) */}
            <div
              className="px-4 sm:px-6 pb-3 pt-1 border-b flex items-center gap-2 sm:gap-3 flex-wrap shrink-0"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
              }}
            >
              {/* Search Box */}
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search to-dos..."
                  className="w-full h-8 sm:h-9 px-3 pl-9 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                  className="h-8 sm:h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer shadow-2xs"
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
                  className={`h-8 sm:h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none shadow-2xs ${
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

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-8 sm:h-9 px-3 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="created-desc">Created On ↓</option>
                  <option value="created-asc">Created On ↑</option>
                  <option value="due-asc">Due Date (Earliest)</option>
                  <option value="priority-desc">Priority (Highest)</option>
                </select>
                <ArrowDownUp className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Action Menu ⋮ with quick access to Recurring, Deleted, Refresh */}
              <div className="relative ml-auto sm:ml-0" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border p-1 z-30 shadow-lg animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-main)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("recurring");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-left"
                    >
                      <Repeat className="w-3.5 h-3.5 text-slate-500" />
                      <span>Recurring Master ({sidebarCounts.recurring})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("deleted");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Deleted Tasks ({sidebarCounts.deleted})</span>
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        loadTasks(true);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-left"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Refresh Tasks</span>
                    </button>
                    {(selectedTag || selectedClientId !== "All" || selectedAssigneeId !== "All" || searchQuery || dueDateFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTag(null);
                          setSelectedClientId("All");
                          setSelectedAssigneeId("All");
                          setSearchQuery("");
                          setDueDateFilter(null);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer text-left"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset All Filters</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. MAIN TASK-LIST AREA */}
            <main className="flex-1 min-w-0 flex flex-col h-full bg-[#FAFAFC] dark:bg-background/80 overflow-y-auto">
              <div className="mx-2 sm:mx-6 my-3 sm:my-6 rounded-xl sm:rounded-2xl border border-gray-200/90 dark:border-border bg-white dark:bg-card shadow-xs flex-1 flex flex-col p-2.5 sm:p-6 min-h-[450px] overflow-hidden">
                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Loading to-do manager...</span>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <TuriaEmptyState
                    onAddTodo={() => setIsAddModalOpen(true)}
                    title={
                      searchQuery || selectedClientId !== "All" || selectedAssigneeId !== "All" || selectedTag
                        ? "No Matching Tasks Found"
                        : activeSection === "completed"
                        ? "No Finished Tasks"
                        : activeSection === "important"
                        ? "No Important Tasks"
                        : activeSection === "recurring"
                        ? "No Recurring Master Tasks"
                        : activeSection === "deleted"
                        ? "No Deleted Tasks"
                        : "Ready to Tackle Your Day?"
                    }
                    subtitle={
                      searchQuery || selectedClientId !== "All" || selectedAssigneeId !== "All" || selectedTag
                        ? "Try resetting filters or searching for something else."
                        : activeSection === "completed"
                        ? "Completed tasks will appear here once marked as finished."
                        : activeSection === "important"
                        ? "Mark tasks as high or urgent priority to see them here."
                        : activeSection === "recurring"
                        ? "Set up recurring tasks to automate regular obligations."
                        : activeSection === "deleted"
                        ? "Tasks you cancel or delete will be preserved here."
                        : "Click 'Add To-Do' to create your first task and get organized!"
                    }
                  />
                ) : (
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
          </div>

          {/* Right Utility Rail */}
          <TuriaRightRail
            onToggleCalendar={() => setIsCalendarView(true)}
            isCalendarActive={false}
          />
        </>
      )}

      {/* Add / Assign To-Do Modal */}
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
