"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Calendar,
  Plus,
  Search,
  ChevronDown,
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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchWorkspaceRequest,
  setActiveSection,
  setAdminScope,
  setSelectedTag,
  setSearchQuery,
  setSelectedClientId,
  setSelectedAssigneeId,
  setSortBy,
  setDueDateFilter,
  setDateFilterTab,
  setTodoPage,
  setTodoLimit,
  resetTodoFilters,
  toggleAdminTaskRequest,
  updateTaskProgressRequest,
  updatePersonalTodoRequest,
} from "@/store/features/todo/todoSlice";
import {
  selectUnifiedTasks,
  selectTodoFilters,
  selectTodoPagination,
  selectIsTodoLoading,
  selectIsTodoRefreshing,
  selectTodoScopeCounts,
  selectTodoSidebarCounts,
  selectFilteredTodoTasks,
  selectDateTabCounts,
  selectDateFilteredTasks,
} from "@/store/features/todo/todoSelectors";
import { fetchClientsRequest } from "@/store/features/clients/clientSlice";
import { fetchTeamRequest } from "@/store/features/team/teamSlice";
import { TeamTaskItem } from "@/services/todoApi";
import { Client } from "@/data/crmData";
import { clientApi } from "@/services/clientApi";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { TuriaNavSection } from "./TuriaTodoSidebar";
import { TuriaEmptyState } from "./TuriaEmptyState";
import { TuriaDateTaskView } from "./TuriaDateTaskView";
import { TuriaAddTodoModal } from "./TuriaAddTodoModal";
import { TodoCalendarView } from "./TodoCalendarView";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import {
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
  userName: _userName,
  defaultCalendarView = false,
}) => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();
  const role = (currentUser?.role || "employee").toLowerCase().trim();
  const isAdmin = ["admin", "owner", "partner", "manager"].includes(role);
  const searchParams = useSearchParams();
  const viewQuery = searchParams?.get("view");

  // Redux Selectors
  const filters = useAppSelector(selectTodoFilters);
  const pagination = useAppSelector(selectTodoPagination);
  const unifiedTasks = useAppSelector(selectUnifiedTasks);
  const filteredTasks = useAppSelector(selectFilteredTodoTasks);
  const dateFilteredTasks = useAppSelector(selectDateFilteredTasks);
  const dateTabCounts = useAppSelector(selectDateTabCounts);
  const sidebarCounts = useAppSelector(selectTodoSidebarCounts);
  const scopeCounts = useAppSelector(selectTodoScopeCounts);
  const isLoading = useAppSelector(selectIsTodoLoading);
  const isRefreshing = useAppSelector(selectIsTodoRefreshing);

  // Clients & Team from Redux store
  const reduxClients = useAppSelector((state) => state.clients.items);
  const reduxTeam = useAppSelector((state) => state.team.members);

  // Local state for fallback clients/employees if store is not yet populated
  const [fallbackClients, setFallbackClients] = useState<Client[]>([]);
  const [fallbackEmployees, setFallbackEmployees] = useState<EmployeeRecord[]>([]);

  // Local UI-only state
  const [isCalendarView, setIsCalendarView] = useState(
    () => defaultCalendarView || viewQuery === "calendar"
  );
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

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
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsViewDropdownOpen(false);
        setIsMoreMenuOpen(false);
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fetch initial tasks via Redux Saga
  const loadTasks = useCallback(
    (isSilent = false) => {
      dispatch(
        fetchWorkspaceRequest({
          isSilent,
          role,
          userId: currentUser?.id,
        })
      );
    },
    [dispatch, role, currentUser?.id]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load clients and employees through Redux store (with fallbacks)
  useEffect(() => {
    if (!reduxClients || reduxClients.length === 0) {
      dispatch(fetchClientsRequest({ page: 1, limit: 100 }));
      clientApi
        .getClients({ page: 1, limit: 100 })
        .then((res) => {
          if (res.data) setFallbackClients(res.data);
        })
        .catch(() => {});
    }

    if (!reduxTeam || reduxTeam.length === 0) {
      dispatch(fetchTeamRequest());
      teamStore
        .loadEmployeesFromBackend()
        .then((emps) => {
          if (emps) {
            const active = emps.filter(
              (e) => (e.status || "").toLowerCase() === "active"
            );
            setFallbackEmployees(active);
          }
        })
        .catch(() => {});
    }
  }, [dispatch, reduxClients, reduxTeam]);

  // Unified clients and employees list
  const clients = useMemo(() => {
    return reduxClients && reduxClients.length > 0 ? reduxClients : fallbackClients;
  }, [reduxClients, fallbackClients]);

  const employees = useMemo(() => {
    if (reduxTeam && reduxTeam.length > 0) {
      return reduxTeam.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        email: m.email,
        phone: m.phone,
        status: m.active ? "active" : "inactive",
      }));
    }
    return fallbackEmployees;
  }, [reduxTeam, fallbackEmployees]);

  // Handlers wired to Redux Saga mutations
  const handleToggleChecklist = (
    taskId: string,
    checklistId: string,
    currentCompleted: boolean
  ) => {
    if (taskId.startsWith("admin:")) {
      dispatch(
        toggleAdminTaskRequest({
          dedupKey: taskId,
          completed: !currentCompleted,
        })
      );
    } else {
      dispatch(
        updateTaskProgressRequest({
          taskId,
          data: {
            toggleChecklistId: checklistId,
            checklistCompleted: !currentCompleted,
          },
        })
      );
    }
  };

  const handleUpdateStatus = (taskId: string, newStatus: string) => {
    if (taskId.startsWith("admin:")) {
      dispatch(
        toggleAdminTaskRequest({
          dedupKey: taskId,
          completed: newStatus === "Completed",
        })
      );
    } else {
      dispatch(
        updateTaskProgressRequest({
          taskId,
          data: {
            status: newStatus,
            progress: newStatus === "Completed" ? 100 : undefined,
          },
        })
      );
    }
  };

  const handleToggleCompleteTask = (task: TeamTaskItem) => {
    const isCurrentlyDone = (task.status || "").toLowerCase() === "completed";
    const nextStatus = isCurrentlyDone ? "Pending" : "Completed";
    const nextProgress = isCurrentlyDone ? 0 : 100;

    if ((task as any).isPersonal || task.id.startsWith("pt_")) {
      dispatch(
        updatePersonalTodoRequest({
          id: task.taskId || task.id.replace("pt_", ""),
          updates: {
            completed: !isCurrentlyDone,
          },
        })
      );
    } else if (
      (task as any).isAdministrative ||
      task.id.startsWith("admin:") ||
      (task as any).sourceType === "dsc" ||
      (task as any).sourceType === "license" ||
      (task as any).sourceType === "document"
    ) {
      dispatch(
        toggleAdminTaskRequest({
          dedupKey: task.id,
          completed: !isCurrentlyDone,
        })
      );
    } else {
      dispatch(
        updateTaskProgressRequest({
          taskId: task.id,
          data: {
            status: nextStatus,
            progress: nextProgress,
          },
        })
      );
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm("Are you sure you want to delete this To-Do task?")) return;
    dispatch(
      updateTaskProgressRequest({
        taskId,
        data: {
          status: "Cancelled",
        },
      })
    );
  };

  const handleStarTask = (taskId: string) => {
    const task = unifiedTasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextPriority =
      task.priority === "High" || task.priority === "Urgent" ? "Medium" : "High";

    if ((task as any).isPersonal || task.id.startsWith("pt_")) {
      const realId = task.taskId || task.id.replace("pt_", "");
      dispatch(
        updatePersonalTodoRequest({
          id: realId,
          updates: {
            priority: nextPriority,
          },
        })
      );
    } else {
      dispatch(
        updateTaskProgressRequest({
          taskId: task.id,
          data: {
            note: `Priority changed to ${nextPriority}`,
          },
        })
      );
    }
  };

  // Active view configuration
  const currentViewConfig =
    TASK_VIEW_OPTIONS.find(
      (opt) =>
        opt.id === filters.activeSection ||
        (opt.id === "my-todo" && (filters.activeSection as string) === "all")
    ) || TASK_VIEW_OPTIONS[0];

  const currentViewCount =
    filters.activeSection === "my-todo" ||
    (filters.activeSection as string) === "all"
      ? sidebarCounts.myTodo
      : filters.activeSection === "important"
      ? sidebarCounts.important
      : filters.activeSection === "completed"
      ? sidebarCounts.completed
      : filters.activeSection === "recurring"
      ? sidebarCounts.recurring
      : sidebarCounts.deleted;

  const ViewIcon = currentViewConfig.icon;

  if (isCalendarView) {
    return (
      <div className="w-full flex flex-col space-y-4">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-1 min-h-[48px]">
          <div className="flex items-center gap-3 py-2 min-h-[40px]">
            <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white">
              To-Do Calendar
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCalendarView(false)}
              className="flex items-center gap-1.5 h-10 px-3.5 rounded-md text-xs font-semibold border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400 transition-all cursor-pointer"
            >
              Switch to List View
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add To-Do</span>
            </button>
          </div>
        </div>

        <div className="w-full bg-white dark:bg-[#1e293b] shadow-card overflow-hidden flex flex-col border border-[#dde2e8] dark:border-[#334155] rounded-md min-h-[600px]">
          <TodoCalendarView
            initialEmployeeFilter={filters.selectedAssigneeId}
            isAdmin={isAdmin}
            adminScope={filters.adminScope}
            onScopeChange={(s) => dispatch(setAdminScope(s))}
            onSwitchToList={() => setIsCalendarView(false)}
            onAddTodo={(dateStr) => {
              if (dateStr) dispatch(setDueDateFilter(dateStr));
              setIsAddModalOpen(true);
            }}
          />
        </div>

        {/* Add / Assign To-Do Modal */}
        <TuriaAddTodoModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => loadTasks(false)}
          isAdmin={isAdmin}
          currentUserId={currentUser?.id}
          currentUserName={currentUser?.name}
          defaultDate={filters.dueDateFilter || undefined}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* 1. Top Heading Row: To-Do (count) on left, Add To-Do on right */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 min-h-[48px]">
        <div className="flex items-center gap-3 py-2 min-h-[40px]">
          <h1 className="text-2xl font-bold tracking-tight text-[#000000] dark:text-white">
            To-Do ({filteredTasks.length})
          </h1>
          {isRefreshing && (
            <span title="Syncing...">
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B] [will-change:transform]" />
            </span>
          )}
        </div>

        {/* Top-Right Add To-Do Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 px-4 rounded-md text-sm font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
          style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add To-Do</span>
        </button>
      </div>

      {/* 2. Main Task-List Container (Full Width, Right Rail Removed) */}
      <div className="w-full bg-white dark:bg-[#1e293b] shadow-card flex flex-col border border-[#dde2e8] dark:border-[#334155] rounded-md">
        {/* Unified Header Toolbar: View Dropdown + Tags (Left) & Search + Filters + Actions (Right) */}
        <div className="p-2 sm:px-3 sm:py-2 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap 2xl:flex-nowrap items-center justify-between gap-2.5 bg-white dark:bg-[#1e293b] relative z-30">
          {/* Left Section: View Dropdown + Tag Navigation */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 py-0.5">
            {/* Task-View Dropdown (All / Important / Finished / Recurring Master / Deleted) */}
            <div className="relative shrink-0 z-50" ref={viewDropdownRef}>
              <button
                id="todo-view-dropdown-button"
                data-testid="todo-view-dropdown-button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsViewDropdownOpen((prev) => !prev);
                }}
                className={`inline-flex items-center gap-2 px-3 sm:px-3.5 h-10 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 shrink-0 ${
                  isViewDropdownOpen
                    ? "border-[#31719B] ring-1 ring-[#31719B]"
                    : "border-[#dde2e8] dark:border-[#475569] hover:border-gray-400"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isViewDropdownOpen}
                title="Select Task View"
              >
                <ViewIcon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    filters.activeSection === "important"
                      ? "text-amber-500 fill-amber-400"
                      : filters.activeSection === "completed"
                      ? "text-emerald-600"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                />
                <span>{currentViewConfig.label}</span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {currentViewCount}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
                    isViewDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isViewDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-60 sm:w-64 rounded-md border border-[#dde2e8] dark:border-[#334155] p-1.5 z-50 shadow-xl bg-white dark:bg-[#1e293b] animate-in fade-in zoom-in-95 duration-100"
                  role="listbox"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Task Views
                  </div>
                  {/* Primary Views: All, Important, Finished */}
                  {TASK_VIEW_OPTIONS.filter((opt) => !opt.isSecondary).map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = filters.activeSection === opt.id;
                    const count =
                      opt.id === "my-todo"
                        ? sidebarCounts.myTodo
                        : opt.id === "important"
                        ? sidebarCounts.important
                        : sidebarCounts.completed;

                    return (
                      <button
                        key={opt.id}
                        data-testid={`todo-view-option-${opt.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setActiveSection(opt.id));
                          dispatch(setTodoPage(1));
                          setIsViewDropdownOpen(false);
                          setIsCalendarView(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? "bg-[#31719B]/10 font-semibold text-[#31719B] dark:text-[#60A5FA]"
                            : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
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
                            <div className="text-[10px] text-slate-400 truncate">
                              {opt.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[11px] font-medium text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            {count}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#31719B] dark:text-[#60A5FA]" />
                          )}
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
                    const isSelected = filters.activeSection === opt.id;
                    const count =
                      opt.id === "recurring"
                        ? sidebarCounts.recurring
                        : sidebarCounts.deleted;

                    return (
                      <button
                        key={opt.id}
                        data-testid={`todo-view-option-${opt.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setActiveSection(opt.id));
                          dispatch(setTodoPage(1));
                          setIsViewDropdownOpen(false);
                          setIsCalendarView(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? "bg-[#31719B]/10 font-semibold text-[#31719B] dark:text-[#60A5FA]"
                            : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                          <div className="min-w-0">
                            <div className="font-semibold">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {opt.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[11px] font-medium text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            {count}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#31719B] dark:text-[#60A5FA]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-5 w-[1px] bg-[#dde2e8] dark:bg-[#334155] shrink-0" />

            {/* Horizontal Tag Pills */}
            <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar snap-x py-0.5">
              {/* All Tags Pill */}
              <button
                type="button"
                onClick={() => {
                  dispatch(setSelectedTag(null));
                  setIsCalendarView(false);
                }}
                className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap border shrink-0 snap-start ${
                  filters.selectedTag === null
                    ? "font-semibold shadow-xs bg-[#31719B] border-[#31719B] text-white"
                    : "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium"
                }`}
              >
                <span>All Tags</span>
              </button>

              {/* Individual Tag Pills */}
              {DEFAULT_TAGS.map((tag) => {
                const isSelected = filters.selectedTag === tag;
                const dotColor = TAG_DOT_COLORS[tag] || "bg-slate-400";

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      dispatch(setSelectedTag(isSelected ? null : tag));
                      setIsCalendarView(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap border shrink-0 snap-start ${
                      isSelected
                        ? "font-semibold shadow-xs bg-[#31719B] border-[#31719B] text-white"
                        : "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium"
                    }`}
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
                className="p-1.5 rounded-full border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-500 dark:text-gray-400 hover:border-gray-400 transition-colors cursor-pointer shrink-0 snap-start"
                title="Add or manage tags"
                aria-label="Add or manage tags"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Section: Search, Dropdowns, Actions, Date Filter, Calendar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Search Box */}
            <div className="relative w-full sm:w-44 md:w-48 lg:w-52 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                id="todo-search-input"
                name="todoSearch"
                aria-label="Search to-dos"
                type="text"
                value={filters.searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                placeholder="Search to-dos..."
                className="h-10 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-9 pr-8 text-xs text-[#000000] dark:text-white outline-none focus:border-[#31719B] transition-colors"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => dispatch(setSearchQuery(""))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Client Filter Dropdown */}
            <div className="w-32 lg:w-36 shrink-0">
              <Select
                aria-label="Filter by client"
                value={filters.selectedClientId}
                onChange={(val) => dispatch(setSelectedClientId(val))}
                placeholder="All Clients"
                searchable
                options={[
                  { value: "All", label: "All Clients" },
                  ...clients.map((c) => ({
                    value: c.name || c.legalName || c.id,
                    label: c.name || c.legalName || "Unnamed Client",
                  })),
                ]}
              />
            </div>

            {/* Assignee Filter Dropdown */}
            <div className="w-32 lg:w-36 shrink-0">
              <Select
                aria-label="Filter by assignee"
                value={filters.selectedAssigneeId}
                onChange={(val) => dispatch(setSelectedAssigneeId(val))}
                placeholder="All Assignees"
                disabled={!isAdmin}
                options={
                  isAdmin
                    ? [
                        { value: "All", label: "All Assignees" },
                        {
                          value: currentUser?.name || "Ayatrio Admin",
                          label: `${currentUser?.name || "Ayatrio Admin"} (Me)`,
                        },
                        ...employees
                          .filter((emp) => emp.name !== currentUser?.name)
                          .map((emp) => ({ value: emp.name, label: emp.name })),
                      ]
                    : [
                        {
                          value: currentUser?.name || "Me",
                          label: currentUser?.name || "My Assigned Tasks",
                        },
                      ]
                }
              />
            </div>

            {/* Sort Dropdown */}
            <div className="w-32 lg:w-36 shrink-0">
              <Select
                aria-label="Sort to-dos"
                value={filters.sortBy}
                onChange={(val) => dispatch(setSortBy(val as any))}
                separator={false}
                options={[
                  { value: "created-desc", label: "Created On ↓" },
                  { value: "created-asc", label: "Created On ↑" },
                  { value: "due-asc", label: "Due Date (Earliest)" },
                  { value: "priority-desc", label: "Priority (Highest)" },
                ]}
              />
            </div>

            {/* Action Menu ⋮ with quick access to Recurring, Deleted, Refresh */}
            <div className="relative shrink-0" ref={moreMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMoreMenuOpen((prev) => !prev);
                }}
                className="h-10 w-10 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 flex items-center justify-center cursor-pointer transition-colors"
                title="More options"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-56 rounded-md border border-[#dde2e8] dark:border-[#334155] p-1.5 z-50 shadow-xl bg-white dark:bg-[#1e293b] animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setActiveSection("recurring"));
                      dispatch(setTodoPage(1));
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer text-left font-medium"
                  >
                    <Repeat className="w-3.5 h-3.5 text-slate-500" />
                    <span>Recurring Master ({sidebarCounts.recurring})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setActiveSection("deleted"));
                      dispatch(setTodoPage(1));
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer text-left font-medium"
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
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer text-left font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Refresh Tasks</span>
                  </button>
                  {(filters.selectedTag ||
                    filters.selectedClientId !== "All" ||
                    filters.selectedAssigneeId !== "All" ||
                    filters.searchQuery ||
                    filters.dueDateFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(resetTodoFilters());
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md cursor-pointer text-left font-medium"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Filter by due date button / popover */}
            <div className="relative shrink-0" ref={datePickerRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDatePicker((prev) => !prev);
                }}
                className={`h-10 px-3 text-xs font-semibold rounded-md border flex items-center gap-1.5 transition-all cursor-pointer ${
                  filters.dueDateFilter
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-semibold"
                    : "border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:border-gray-400"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>
                  {filters.dueDateFilter
                    ? `Due: ${formatFriendlyDate(filters.dueDateFilter)}`
                    : "Filter by due date"}
                </span>
                {filters.dueDateFilter && (
                  <X
                    className="w-3 h-3 text-indigo-500 hover:text-indigo-700 ml-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(setDueDateFilter(null));
                    }}
                  />
                )}
              </button>

              {/* Date Filter Dropdown Popover */}
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-[#1e293b] rounded-md shadow-xl border border-[#dde2e8] dark:border-[#334155] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Quick Date Select
                  </div>
                  <div className="space-y-1 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(setDueDateFilter(getTodayKolkataYMD()));
                        setShowDatePicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Today ({formatFriendlyDate(getTodayKolkataYMD())})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(setDueDateFilter(getTomorrowKolkataYMD()));
                        setShowDatePicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Tomorrow ({formatFriendlyDate(getTomorrowKolkataYMD())})
                    </button>
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <label className="block text-[11px] text-gray-500 mb-1">
                      Or pick custom date:
                    </label>
                    <input
                      type="date"
                      value={filters.dueDateFilter || ""}
                      onChange={(e) => {
                        dispatch(setDueDateFilter(e.target.value || null));
                        setShowDatePicker(false);
                      }}
                      className="w-full px-2.5 py-1 text-xs rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Calendar button */}
            <button
              type="button"
              onClick={() => setIsCalendarView(true)}
              className="h-10 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Open Full-Page Notices-Style Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-[#31719B]" />
              <span>Calendar</span>
            </button>
          </div>
        </div>

          {/* Row 3: Second Toolbar Row (Agenda Tabs immediately beneath first toolbar row, spanning full width) */}
          <div className="px-4 py-2 border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 shrink-0 relative z-10">
            {/* Agenda Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0 max-w-full">
              <button
                type="button"
                onClick={() => dispatch(setDateFilterTab("all"))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                  filters.dateFilterTab === "all"
                    ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] border border-[#dde2e8] dark:border-[#334155] shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                All Agenda ({dateTabCounts.all})
              </button>
              <button
                type="button"
                onClick={() => dispatch(setDateFilterTab("today"))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                  filters.dateFilterTab === "today"
                    ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] border border-[#dde2e8] dark:border-[#334155] shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Today ({dateTabCounts.today})
              </button>
              <button
                type="button"
                onClick={() => dispatch(setDateFilterTab("tomorrow"))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                  filters.dateFilterTab === "tomorrow"
                    ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] border border-[#dde2e8] dark:border-[#334155] shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Tomorrow ({dateTabCounts.tomorrow})
              </button>
              <button
                type="button"
                onClick={() => dispatch(setDateFilterTab("upcoming"))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                  filters.dateFilterTab === "upcoming"
                    ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] border border-[#dde2e8] dark:border-[#334155] shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Upcoming ({dateTabCounts.upcoming})
              </button>
              <button
                type="button"
                onClick={() => dispatch(setDateFilterTab("overdue"))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                  filters.dateFilterTab === "overdue"
                    ? "bg-white dark:bg-[#1e293b] text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shadow-2xs"
                    : dateTabCounts.overdue > 0
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Overdue ({dateTabCounts.overdue})
              </button>
            </div>

            {/* Admin Scope Switcher: My Work | Team Work | All Work */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-md shrink-0 border border-[#dde2e8]/60 dark:border-[#334155]/60">
                <button
                  type="button"
                  onClick={() => dispatch(setAdminScope("my_work"))}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer shrink-0 ${
                    filters.adminScope === "my_work"
                      ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] shadow-2xs font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  My Work ({scopeCounts.myWork})
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setAdminScope("team_work"))}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer shrink-0 ${
                    filters.adminScope === "team_work"
                      ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] shadow-2xs font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Team Work ({scopeCounts.teamWork})
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setAdminScope("all_work"))}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer shrink-0 ${
                    filters.adminScope === "all_work"
                      ? "bg-white dark:bg-[#1e293b] text-[#31719B] dark:text-[#60A5FA] shadow-2xs font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  All Work ({scopeCounts.allWork})
                </button>
              </div>
            )}
          </div>

          {/* Row 4: Task List / Table Area */}
          <div className="flex-1 flex flex-col min-h-[450px]">
            {isLoading && unifiedTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
                <span>Loading to-do manager...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <TuriaEmptyState
                onAddTodo={() => setIsAddModalOpen(true)}
                title={
                  filters.searchQuery ||
                  filters.selectedClientId !== "All" ||
                  filters.selectedAssigneeId !== "All" ||
                  filters.selectedTag
                    ? "No Matching Tasks Found"
                    : filters.activeSection === "completed"
                    ? "No Finished Tasks"
                    : filters.activeSection === "important"
                    ? "No Important Tasks"
                    : filters.activeSection === "recurring"
                    ? "No Recurring Master Tasks"
                    : filters.activeSection === "deleted"
                    ? "No Deleted Tasks"
                    : "Ready to Tackle Your Day?"
                }
                subtitle={
                  filters.searchQuery ||
                  filters.selectedClientId !== "All" ||
                  filters.selectedAssigneeId !== "All" ||
                  filters.selectedTag
                    ? "Try resetting filters or searching for something else."
                    : filters.activeSection === "completed"
                    ? "Completed tasks will appear here once marked as finished."
                    : filters.activeSection === "important"
                    ? "Mark tasks as high or urgent priority to see them here."
                    : filters.activeSection === "recurring"
                    ? "Set up recurring tasks to automate regular obligations."
                    : filters.activeSection === "deleted"
                    ? "Tasks you cancel or delete will be preserved here."
                    : "Click 'Add To-Do' to create your first task and get organized!"
                }
              />
            ) : (
              <div className="flex-1 flex flex-col">
                <TuriaDateTaskView
                  tasks={filteredTasks}
                  isAdmin={isAdmin}
                  onToggleChecklist={handleToggleChecklist}
                  onUpdateStatus={handleUpdateStatus}
                  onToggleCompleteTask={handleToggleCompleteTask}
                  onDeleteTask={handleDeleteTask}
                  onStarTask={handleStarTask}
                  activeFilterTab={filters.dateFilterTab}
                  onTabChange={(t) => dispatch(setDateFilterTab(t))}
                  adminScope={filters.adminScope}
                  onScopeChange={(s) => dispatch(setAdminScope(s))}
                  scopeCounts={scopeCounts}
                  hideHeader={true}
                />

                {/* Pagination footer if tasks exceed page limit */}
                {dateFilteredTasks.length > 10 && (
                  <Pagination
                    currentPage={pagination.page}
                    pageSize={pagination.limit}
                    totalItems={dateFilteredTasks.length}
                    onPageChange={(p) => dispatch(setTodoPage(p))}
                    onPageSizeChange={(s) => dispatch(setTodoLimit(s))}
                  />
                )}
              </div>
            )}
          </div>
        </div>

      {/* Add / Assign To-Do Modal */}
      <TuriaAddTodoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadTasks(false)}
        isAdmin={isAdmin}
        currentUserId={currentUser?.id}
        currentUserName={currentUser?.name}
        defaultDate={filters.dueDateFilter || undefined}
      />
    </div>
  );
};
