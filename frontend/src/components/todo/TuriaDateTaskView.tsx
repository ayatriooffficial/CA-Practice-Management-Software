"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Star,
  CheckCircle2,
  MoreVertical,
  ChevronDown,
  Trash2,
  UserCheck,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react";
import { TeamTaskItem } from "@/services/todoApi";
import {
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

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatTuriaDueDate(dateStr?: string): { text: string; isWarning: boolean } {
  if (!dateStr) return { text: "-", isWarning: false };
  const parts = dateStr.split("-");
  if (parts.length < 3) return { text: dateStr, isWarning: false };
  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10);
  const monthName = MONTH_SHORT[m - 1] || "";
  const dayStr = String(d).padStart(2, "0");

  const todayYMD = getTodayKolkataYMD();
  const isWarning = dateStr <= todayYMD;

  return {
    text: `${dayStr} ${monthName}`,
    isWarning,
  };
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
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [starredTaskIds, setStarredTaskIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStarToggle = (id: string) => {
    setStarredTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
    onStarTask?.(id);
  };

  // Filter tasks based on activeFilterTab
  const filteredTasks = tasks.filter((task) => {
    if (activeFilterTab === "all") return true;
    const isCompleted = (task.status || "").toLowerCase() === "completed";
    const cat = categorizeTaskByDate(task.targetDueDate, isCompleted);
    return cat === activeFilterTab;
  });

  const getPriorityBadge = (priority?: string) => {
    const p = (priority || "Medium").toLowerCase();
    if (p === "urgent") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]">
          Urgent
        </span>
      );
    }
    if (p === "high") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
          High
        </span>
      );
    }
    if (p === "low") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
          Low
        </span>
      );
    }
    // Default Medium
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#FEF3EB] text-[#E07A2C] border border-[#FCD8BE]/60">
        Medium
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Date Agenda Tabs */}
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
            Today (
            {
              tasks.filter(
                (t) =>
                  categorizeTaskByDate(
                    t.targetDueDate,
                    (t.status || "").toLowerCase() === "completed"
                  ) === "today"
              ).length
            }
            )
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
            Tomorrow (
            {
              tasks.filter(
                (t) =>
                  categorizeTaskByDate(
                    t.targetDueDate,
                    (t.status || "").toLowerCase() === "completed"
                  ) === "tomorrow"
              ).length
            }
            )
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
            Upcoming (
            {
              tasks.filter(
                (t) =>
                  categorizeTaskByDate(
                    t.targetDueDate,
                    (t.status || "").toLowerCase() === "completed"
                  ) === "upcoming"
              ).length
            }
            )
          </button>
        </div>
      )}

      {/* Main Table Structure Matching Turia Reference */}
      <div className="rounded-xl border border-gray-200/80 dark:border-border overflow-hidden bg-white dark:bg-card shadow-2xs">
        {/* Table Header Row */}
        <div className="bg-[#F8FAFC] dark:bg-slate-800/60 border-b border-gray-200/80 dark:border-border/80 px-4 py-2.5 flex items-center text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase select-none">
          <div className="w-16 shrink-0 flex items-center" />
          <div className="flex-1 min-w-[200px] pr-4">TITLE</div>
          <div className="w-36 shrink-0 pr-4">CLIENT</div>
          <div className="w-24 shrink-0 pr-4">TAG</div>
          <div className="w-24 shrink-0 pr-4">PRIORITY</div>
          <div className="w-28 shrink-0 pr-4">DUE</div>
          <div className="w-16 shrink-0 text-center">WHO</div>
          <div className="w-8 shrink-0" />
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-gray-100 dark:divide-border/60">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No tasks found for this view.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = (task.status || "").toLowerCase() === "completed";
              const isStarred = Boolean(starredTaskIds[task.id]);
              const isExpanded = Boolean(expandedTaskIds[task.id]);
              const dueInfo = formatTuriaDueDate(task.targetDueDate);

              const initials =
                task.assigneeInitials ||
                (task.assigneeName
                  ? task.assigneeName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "AS");

              const checklistTotal = task.checklist?.length || 0;
              const checklistDone =
                task.checklist?.filter((c) => c.completed).length || 0;

              return (
                <div key={task.id} className="group hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Primary Row Content */}
                  <div className="px-4 py-3 flex items-center text-xs text-gray-800 dark:text-gray-200">
                    {/* Circle Checkbox + Star */}
                    <div className="w-16 shrink-0 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleCompleteTask(task)}
                        className="cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={isCompleted ? "Mark incomplete" : "Mark complete"}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-slate-600 hover:border-indigo-500 transition-colors" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStarToggle(task.id)}
                        className={`cursor-pointer transition-colors ${
                          isStarred
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-300 dark:text-slate-600 hover:text-amber-400"
                        }`}
                        title="Star task"
                      >
                        <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400" : ""}`} />
                      </button>
                    </div>

                    {/* Title + Description Preview */}
                    <div className="flex-1 min-w-[200px] pr-4 flex items-center gap-2 truncate">
                      <span
                        className={`font-semibold cursor-pointer truncate ${
                          isCompleted
                            ? "line-through text-gray-400 dark:text-gray-500"
                            : "text-gray-900 dark:text-white"
                        }`}
                        onClick={() => toggleExpand(task.id)}
                      >
                        {task.taskName}
                      </span>
                      {task.description && (
                        <span className="text-gray-400 dark:text-gray-500 truncate text-[11px] font-normal">
                          {task.description}
                        </span>
                      )}
                      {checklistTotal > 0 && (
                        <span
                          onClick={() => toggleExpand(task.id)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                        >
                          {checklistDone}/{checklistTotal}
                        </span>
                      )}
                    </div>

                    {/* Client */}
                    <div className="w-36 shrink-0 pr-4 truncate text-gray-600 dark:text-gray-300">
                      {task.clientName && task.clientName !== "General Client" ? (
                        <span title={task.clientName}>{task.clientName}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600">-</span>
                      )}
                    </div>

                    {/* Tag */}
                    <div className="w-24 shrink-0 pr-4 truncate">
                      {task.category ? (
                        <span className="text-[11px] text-gray-600 dark:text-gray-400">
                          {task.category}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600">-</span>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="w-24 shrink-0 pr-4">
                      {getPriorityBadge(task.priority)}
                    </div>

                    {/* Due */}
                    <div className="w-28 shrink-0 pr-4">
                      {dueInfo.isWarning ? (
                        <div className="flex items-center gap-1.5 text-[#D97706] font-semibold text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 fill-[#FEF3C7] text-[#D97706] stroke-[2.2]" />
                          <span>{dueInfo.text}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {dueInfo.text}
                        </span>
                      )}
                    </div>

                    {/* Who (Assignee Avatar) */}
                    <div className="w-16 shrink-0 flex items-center justify-center">
                      <div
                        className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center border border-slate-300 dark:border-slate-600 shadow-2xs"
                        title={task.assigneeName || "Ayatrio Team"}
                      >
                        {initials}
                      </div>
                    </div>

                    {/* Row Action Menu ⋮ */}
                    <div className="w-8 shrink-0 relative flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuTaskId((prev) => (prev === task.id ? null : task.id));
                        }}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Popover */}
                      {activeMenuTaskId === task.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border shadow-xl z-30 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onToggleCompleteTask(task);
                              setActiveMenuTaskId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{isCompleted ? "Mark Pending" : "Mark Done"}</span>
                          </button>

                          {isAdmin && onReassignTask && (
                            <button
                              type="button"
                              onClick={() => {
                                onReassignTask(task);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                              <span>Reassign Task</span>
                            </button>
                          )}

                          {task.taskId && (
                            <a
                              href={`/task/view/${task.taskId}`}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer"
                              onClick={() => setActiveMenuTaskId(null)}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Open Details</span>
                            </a>
                          )}

                          {isAdmin && onDeleteTask && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTask(task.id);
                                setActiveMenuTaskId(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Subtasks / Details Drawer */}
                  {isExpanded && (
                    <div className="px-14 py-3 bg-gray-50/70 dark:bg-slate-900/40 border-t border-gray-100 dark:border-border/60 text-xs space-y-2 animate-in fade-in duration-150">
                      {task.description && (
                        <div className="text-gray-600 dark:text-gray-300 text-xs pb-1">
                          {task.description}
                        </div>
                      )}

                      {task.checklist && task.checklist.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            Checklist / Subtasks ({checklistDone}/{checklistTotal})
                          </div>
                          {task.checklist.map((chk) => (
                            <div key={chk.id} className="flex items-center gap-2">
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
                                className={`${
                                  chk.completed
                                    ? "line-through text-gray-400 dark:text-gray-500"
                                    : "text-gray-700 dark:text-gray-200"
                                }`}
                              >
                                {chk.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-2 text-[11px] text-gray-400">
                        <span>Task ID: {task.taskId || task.id}</span>
                        <span>Assignee: {task.assigneeName || "Unassigned"}</span>
                        <span>Status: {task.status || "Pending"}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
