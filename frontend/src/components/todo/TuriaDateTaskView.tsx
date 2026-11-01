"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Building,
  User,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Star,
  Trash2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { TeamTaskItem } from "@/services/todoApi";
import {
  formatFriendlyDate,
  getTodayKolkataYMD,
  getTomorrowKolkataYMD,
  categorizeTaskByDate,
} from "./todoDateUtils";

interface TuriaDateTaskViewProps {
  tasks: TeamTaskItem[];
  isAdmin: boolean;
  onToggleChecklist: (taskId: string, checklistId: string, currentCompleted: boolean) => void;
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onToggleCompleteTask: (task: TeamTaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onReassignTask?: (task: TeamTaskItem) => void;
  onStarTask?: (taskId: string) => void;
  activeFilterTab?: "all" | "today" | "tomorrow" | "upcoming";
  onTabChange?: (tab: "all" | "today" | "tomorrow" | "upcoming") => void;
}

export const TuriaDateTaskView: React.FC<TuriaDateTaskViewProps> = ({
  tasks,
  isAdmin,
  onToggleChecklist,
  onUpdateStatus,
  onToggleCompleteTask,
  onDeleteTask,
  onReassignTask,
  onStarTask,
  activeFilterTab = "all",
  onTabChange,
}) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const todayYMD = getTodayKolkataYMD();
  const tomorrowYMD = getTomorrowKolkataYMD();

  // Categorize tasks into date groups
  const todayTasks: TeamTaskItem[] = [];
  const tomorrowTasks: TeamTaskItem[] = [];
  const upcomingTasks: TeamTaskItem[] = [];
  const overdueTasks: TeamTaskItem[] = [];

  tasks.forEach((task) => {
    const isCompleted = (task.status || "").toLowerCase() === "completed";
    const cat = categorizeTaskByDate(task.targetDueDate, isCompleted);
    if (cat === "today") todayTasks.push(task);
    else if (cat === "tomorrow") tomorrowTasks.push(task);
    else if (cat === "overdue") overdueTasks.push(task);
    else upcomingTasks.push(task);
  });

  const renderTaskCard = (task: TeamTaskItem) => {
    const isCompleted = (task.status || "").toLowerCase() === "completed";
    const isExpanded = Boolean(expandedTaskIds[task.id]);
    const checklistTotal = task.checklist?.length || 0;
    const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
    const progress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : (task.progress || (isCompleted ? 100 : 0));

    return (
      <div
        key={task.id}
        className={`group p-4 rounded-xl border transition-all ${
          isCompleted
            ? "bg-gray-50/70 dark:bg-slate-900/40 border-gray-200/60 dark:border-border/40 opacity-75"
            : "bg-white dark:bg-card border-gray-200/90 dark:border-border hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Checkbox & Main Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onToggleCompleteTask(task)}
              className="mt-0.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
              title={isCompleted ? "Mark incomplete" : "Mark completed"}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
              ) : (
                <Square className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              {/* Title & Priority Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold tracking-tight transition-colors ${
                    isCompleted
                      ? "line-through text-gray-400 dark:text-gray-500"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {task.taskName}
                </span>

                {/* Priority Badge */}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    task.priority === "Urgent"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
                      : task.priority === "High"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60"
                      : task.priority === "Low"
                      ? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60"
                  }`}
                >
                  {task.priority || "Medium"}
                </span>

                {/* Category Badge */}
                {task.category && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                    {task.category}
                  </span>
                )}
              </div>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {task.description}
                </p>
              )}

              {/* Client & Assignee Meta Row */}
              <div className="flex items-center gap-3 mt-2.5 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                {/* Client Name */}
                {task.clientName && (
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                    <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{task.clientName}</span>
                  </div>
                )}

                {/* Assignee Avatar & Name */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: task.assigneeColor || "#3B82F6" }}
                  >
                    {task.assigneeInitials || (task.assigneeName ? task.assigneeName.slice(0, 2).toUpperCase() : "UA")}
                  </div>
                  <span className="truncate max-w-[140px] text-gray-600 dark:text-gray-300">
                    {task.assigneeName || "Unassigned"}
                  </span>
                </div>

                {/* Due Date & Time Badge */}
                {task.targetDueDate && (
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                      task.isOverdue
                        ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30"
                        : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800"
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Due {formatFriendlyDate(task.targetDueDate)}</span>
                  </div>
                )}

                {/* Progress bar info */}
                {checklistTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(task.id)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <span>
                      {checklistDone}/{checklistTotal} steps ({progress}%)
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </div>

              {/* Progress bar indicator */}
              <div className="mt-2 w-full max-w-md bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isCompleted
                      ? "bg-emerald-500"
                      : progress >= 66
                      ? "bg-indigo-600"
                      : progress >= 33
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Expandable Checklist Steps */}
              {isExpanded && checklistTotal > 0 && (
                <div className="mt-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1.5 animate-in fade-in duration-150">
                  {task.checklist.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleChecklist(task.id, chk.id, chk.completed)}
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      >
                        {chk.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <span
                        className={`truncate ${
                          chk.completed ? "line-through text-gray-400" : ""
                        }`}
                      >
                        {chk.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Right Side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Dropdown */}
            <select
              value={task.status || "Pending"}
              onChange={(e) => onUpdateStatus(task.id, e.target.value)}
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Star Important */}
            <button
              type="button"
              onClick={() => onStarTask?.(task.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mark Important"
            >
              <Star className="w-4 h-4" />
            </button>

            {/* Delete button (Admin or Owner) */}
            {isAdmin && onDeleteTask && (
              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Delete To-Do"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    subtitle: string,
    sectionTasks: TeamTaskItem[],
    accentColor: string,
    badgeBg: string,
    badgeText: string
  ) => {
    if (sectionTasks.length === 0) return null;

    return (
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-border/60">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${accentColor}`} />
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              {title}
            </h4>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              ({subtitle})
            </span>
          </div>

          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeBg} ${badgeText}`}
          >
            {sectionTasks.length} {sectionTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Task Cards */}
        <div className="space-y-2.5">
          {sectionTasks.map((t) => renderTaskCard(t))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Agenda View Filter Pills */}
      {onTabChange && (
        <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-border/60">
          <button
            type="button"
            onClick={() => onTabChange("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeFilterTab === "all"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold shadow-2xs"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            All Agenda ({tasks.length})
          </button>

          <button
            type="button"
            onClick={() => onTabChange("today")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeFilterTab === "today"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold shadow-2xs"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            Today ({todayTasks.length})
          </button>

          <button
            type="button"
            onClick={() => onTabChange("tomorrow")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeFilterTab === "tomorrow"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold shadow-2xs"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            Tomorrow ({tomorrowTasks.length})
          </button>

          <button
            type="button"
            onClick={() => onTabChange("upcoming")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeFilterTab === "upcoming"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold shadow-2xs"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            Upcoming ({upcomingTasks.length})
          </button>
        </div>
      )}

      {/* Render sections according to active tab */}
      {(activeFilterTab === "all" || activeFilterTab === "today") &&
        renderSection(
          "TODAY",
          formatFriendlyDate(todayYMD),
          todayTasks,
          "bg-indigo-600",
          "bg-indigo-50 dark:bg-indigo-950/40",
          "text-indigo-700 dark:text-indigo-300"
        )}

      {(activeFilterTab === "all" || activeFilterTab === "tomorrow") &&
        renderSection(
          "TOMORROW",
          formatFriendlyDate(tomorrowYMD),
          tomorrowTasks,
          "bg-blue-500",
          "bg-blue-50 dark:bg-blue-950/40",
          "text-blue-700 dark:text-blue-300"
        )}

      {(activeFilterTab === "all" || activeFilterTab === "upcoming") &&
        renderSection(
          "UPCOMING WORK",
          "Next scheduled deliverables",
          upcomingTasks,
          "bg-emerald-500",
          "bg-emerald-50 dark:bg-emerald-950/40",
          "text-emerald-700 dark:text-emerald-300"
        )}

      {activeFilterTab === "all" &&
        overdueTasks.length > 0 &&
        renderSection(
          "OVERDUE",
          "Requires immediate attention",
          overdueTasks,
          "bg-rose-500",
          "bg-rose-50 dark:bg-rose-950/40",
          "text-rose-700 dark:text-rose-400"
        )}
    </div>
  );
};
