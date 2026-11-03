"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  List as ListIcon,
  Filter,
} from "lucide-react";
import { todoApi, TodoCalendarEvent } from "@/services/todoApi";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type TypeFilter = "All" | "admin_deadline" | "task_due" | "personal_todo";
type StatusFilter = "All" | "Pending" | "Overdue" | "Completed";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "All", label: "All statuses" },
  { value: "Pending", label: "Pending / Upcoming" },
  { value: "Overdue", label: "Overdue" },
  { value: "Completed", label: "Completed" },
];

function toMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  const cells: { date: string; isCurrentMonth: boolean }[] = [];

  // Leading days from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const [py, pm] = month === 1 ? [year - 1, 12] : [year, month - 1];
    cells.push({
      date: `${py}-${String(pm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: true,
    });
  }

  // Trailing days from next month
  const remaining = 42 - cells.length;
  const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1];
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false,
    });
  }

  return cells;
}

interface EventDetailModalProps {
  event: TodoCalendarEvent | null;
  onClose: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const typeLabel =
    event.type === "admin_deadline"
      ? "Administrative Deadline"
      : event.type === "task_due"
      ? "Task Due Date"
      : event.type === "task_start"
      ? "Task Start Date"
      : "Personal To-Do";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-xl border relative"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
          color: "var(--text-main)",
        }}
      >
        <div className="flex items-start justify-between pb-3 border-b" style={{ borderColor: "var(--border-main)" }}>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {typeLabel}
            </span>
            <h3 className="text-base font-bold mt-1 text-main leading-snug">{event.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-subtle text-xs">Date:</span>
            <span className="font-medium">{event.date}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-subtle text-xs">Priority:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                event.priority === "Urgent"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  : event.priority === "High"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
              }`}
            >
              {event.priority}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-subtle text-xs">Status:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                event.isCompleted
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : event.isOverdue
                  ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {event.isCompleted ? "Completed" : event.isOverdue ? "Overdue" : event.status}
            </span>
          </div>

          {event.clientName && (
            <div className="flex items-center justify-between">
              <span className="text-subtle text-xs">Client:</span>
              <span className="font-medium truncate max-w-[200px]">{event.clientName}</span>
            </div>
          )}

          {event.assigneeName && (
            <div className="flex items-center justify-between">
              <span className="text-subtle text-xs">Assignee:</span>
              <span className="font-medium">{event.assigneeName}</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-3 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-main)" }}>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-subtle transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-main)" }}
          >
            Close
          </button>
          {event.actionUrl && (
            <Link
              href={event.actionUrl}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              Open Record <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          {event.taskId && !event.actionUrl && (
            <Link
              href={`/task/view/${event.taskId}`}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              View Task <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

interface DayPopoverProps {
  date: string;
  events: TodoCalendarEvent[];
  onClose: () => void;
  onSelectEvent: (ev: TodoCalendarEvent) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

const DayPopover: React.FC<DayPopoverProps> = ({
  date,
  events,
  onClose,
  onSelectEvent,
  anchorRef,
}) => {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const formattedDate = (() => {
    const [y, m, d] = date.split("-");
    const monthName = MONTH_NAMES[parseInt(m, 10) - 1] ?? m;
    return `${parseInt(d, 10)} ${monthName} ${y}`;
  })();

  return (
    <div
      ref={popRef}
      className="absolute z-50 left-0 top-full mt-1 w-72 rounded-lg shadow-dropdown border p-3 text-xs"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-main)",
        color: "var(--text-main)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: "var(--border-main)" }}>
        <span className="font-semibold">{formattedDate}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:opacity-70 cursor-pointer"
          style={{ color: "var(--text-subtle)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
        {events.map((ev) => {
          const isOverdue = ev.isOverdue;
          const isCompleted = ev.isCompleted;

          return (
            <div
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className="p-2 rounded flex flex-col gap-1 border cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium truncate text-xs">{ev.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : isOverdue
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                  }`}
                >
                  {isCompleted ? "Done" : isOverdue ? "Overdue" : ev.priority}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-subtle">
                <span className="truncate">{ev.clientName || ev.assigneeName || "Ayatrio"}</span>
                <span className="capitalize">{ev.type.replace("_", " ")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CalendarCellProps {
  date: string;
  isCurrentMonth: boolean;
  events: TodoCalendarEvent[];
  todayStr: string;
  onSelectEvent: (ev: TodoCalendarEvent) => void;
  onCellClick?: () => void;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  isCurrentMonth,
  events,
  todayStr,
  onSelectEvent,
  onCellClick,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const dayNum = parseInt(date.split("-")[2], 10);
  const isToday = date === todayStr;

  const MAX_VISIBLE = 2;
  const visible = events.slice(0, MAX_VISIBLE);
  const overflow = events.length - MAX_VISIBLE;

  return (
    <div
      ref={cellRef}
      onClick={onCellClick}
      className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors relative border cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
        !isCurrentMonth ? "opacity-35" : ""
      }`}
      style={{
        backgroundColor: isToday ? "var(--bg-active)" : "var(--bg-surface)",
        borderColor: "var(--border-main)",
      }}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1 pointer-events-none">
        <div className="flex items-center gap-1.5">
          {isToday ? (
            <>
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-xs shrink-0"
                style={{ backgroundColor: "var(--primary)", color: "var(--text-inverse)" }}
              >
                {dayNum}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--primary)" }}
              >
                TODAY
              </span>
            </>
          ) : (
            <span
              className="text-xs font-medium"
              style={{ color: isCurrentMonth ? "var(--text-main)" : "var(--text-subtle)" }}
            >
              {dayNum}
            </span>
          )}
        </div>
      </div>

      {/* Event badges */}
      <div className="flex flex-col gap-1 flex-1">
        {visible.map((ev) => {
          const isOverdue = ev.isOverdue;
          const isCompleted = ev.isCompleted;

          const badgeClasses = isCompleted
            ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
            : isOverdue
            ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
            : ev.type === "admin_deadline"
            ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
            : "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300";

          return (
            <button
              key={ev.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(ev);
              }}
              className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium border truncate transition-opacity hover:opacity-85 cursor-pointer ${badgeClasses}`}
              title={`${ev.title} (${ev.date})`}
            >
              {ev.title}
            </button>
          );
        })}

        {overflow > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(true);
            }}
            className="text-[10px] font-semibold text-primary hover:underline text-left mt-0.5 cursor-pointer"
          >
            +{overflow} more
          </button>
        )}
      </div>

      {showPopover && (
        <DayPopover
          date={date}
          events={events}
          onClose={() => setShowPopover(false)}
          onSelectEvent={(ev) => {
            setShowPopover(false);
            onSelectEvent(ev);
          }}
          anchorRef={cellRef}
        />
      )}
    </div>
  );
};

export interface TodoCalendarViewProps {
  initialEmployeeFilter?: string;
  isAdmin?: boolean;
  onSwitchToList?: () => void;
  onAddTodo?: (dateStr?: string) => void;
  adminScope?: "my_work" | "team_work" | "all_work";
  onScopeChange?: (scope: "my_work" | "team_work" | "all_work") => void;
}

export const TodoCalendarView: React.FC<TodoCalendarViewProps> = ({
  initialEmployeeFilter = "All",
  isAdmin = false,
  onSwitchToList,
  onAddTodo,
  adminScope = "my_work",
  onScopeChange,
}) => {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  const [events, setEvents] = useState<TodoCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeFilter);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TodoCalendarEvent | null>(null);

  const monthStr = toMonthString(currentYear, currentMonth);

  // Sync initial employee filter
  useEffect(() => {
    if (initialEmployeeFilter) {
      setEmployeeFilter(initialEmployeeFilter);
    }
  }, [initialEmployeeFilter]);

  // Click outside to close status dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load employees for admin calendar filtering
  useEffect(() => {
    let mounted = true;
    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (mounted && emps) {
          setEmployees(emps.filter((e) => (e.status || "").toLowerCase() === "active"));
        }
      })
      .catch((err) => console.error("Error loading employees for calendar filter:", err));

    return () => {
      mounted = false;
    };
  }, []);

  // Today in IST
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await todoApi.getCalendarEvents(monthStr, employeeFilter);
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [monthStr, employeeFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Filter events based on scope, type, and status
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Admin Scope Filtering
      if (isAdmin) {
        if (adminScope === "my_work") {
          // My Work shows personal to-dos and owner administrative deadlines
          if (!ev.isPersonal && ev.type !== "admin_deadline" && ev.type !== "personal_todo") {
            return false;
          }
        } else if (adminScope === "team_work") {
          // Team Work shows delegated tasks to team members
          if (ev.isPersonal || ev.type === "admin_deadline") {
            return false;
          }
        }
      }

      // Type filter
      if (typeFilter !== "All") {
        if (typeFilter === "personal_todo" && ev.type !== "personal_todo") return false;
        if (typeFilter === "admin_deadline" && ev.type !== "admin_deadline") return false;
        if (typeFilter === "task_due" && ev.type !== "task_due" && ev.type !== "task_start") return false;
      }

      // Status filter
      if (statusFilter !== "All") {
        if (statusFilter === "Completed" && !ev.isCompleted) return false;
        if (statusFilter === "Overdue" && !ev.isOverdue) return false;
        if (statusFilter === "Pending" && (ev.isCompleted || ev.isOverdue)) return false;
      }

      return true;
    });
  }, [events, isAdmin, adminScope, typeFilter, statusFilter]);

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TodoCalendarEvent[]>();
    for (const ev of filteredEvents) {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return map;
  }, [filteredEvents]);

  const cells = useMemo(
    () => buildCalendarCells(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const currentStatusLabel =
    STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || "All statuses";

  return (
    <div className="flex flex-col w-full flex-1 min-h-[calc(100vh-120px)] bg-white dark:bg-card">
      {/* 1. Filter and Control Bar matching NoticeCalendarView exactly */}
      <div
        className="px-3 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 border-b text-xs"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        {/* Left: Month Navigator & Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded border hover:opacity-70 transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded border font-medium"
            style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
          >
            <span>
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded border hover:opacity-70 transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 rounded border font-semibold text-xs transition-colors hover:bg-slate-50 cursor-pointer"
            style={{
              borderColor: "var(--border-main)",
              color: "var(--primary)",
            }}
          >
            Today
          </button>
          {isLoading && (
            <span className="text-[10px] animate-pulse" style={{ color: "var(--text-subtle)" }}>
              Loading…
            </span>
          )}
        </div>

        {/* Right: Scope Switcher + Filters + Mode Toggle + Add To-Do */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Admin Scope Pills: My Work | Team Work | All Work */}
          {isAdmin && onScopeChange && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-slate-900/50">
              {(["my_work", "team_work", "all_work"] as const).map((sc) => {
                const label = sc === "my_work" ? "My Work" : sc === "team_work" ? "Team Work" : "All Work";
                const isActive = adminScope === sc;
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => onScopeChange(sc)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-card text-indigo-600 dark:text-indigo-400 shadow-2xs border border-gray-200/60 dark:border-slate-700"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Status Dropdown matching Notices Calendar */}
          <div className="flex items-center gap-1.5 relative" ref={statusRef}>
            <span className="uppercase text-[11px] font-semibold tracking-wider" style={{ color: "var(--text-subtle)" }}>
              STATUS
            </span>
            <button
              type="button"
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-2 px-2.5 py-1 rounded border font-medium cursor-pointer"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <span>{currentStatusLabel}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
            </button>

            {statusOpen && (
              <div
                className="absolute z-40 top-full mt-1 right-0 w-44 rounded-md shadow-dropdown border py-1 text-xs"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:opacity-80 transition-colors cursor-pointer ${
                      statusFilter === opt.value ? "font-semibold" : ""
                    }`}
                    style={{
                      color: statusFilter === opt.value ? "var(--primary)" : "var(--text-main)",
                      backgroundColor: statusFilter === opt.value ? "var(--bg-active)" : "transparent",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter Pills: All | Tasks | Administrative | Personal */}
          <div className="flex items-center gap-1">
            {[
              { id: "All", label: "All" },
              { id: "task_due", label: "Tasks" },
              { id: "admin_deadline", label: "Administrative" },
              { id: "personal_todo", label: "Personal" },
            ].map((pill) => {
              const isSelected = typeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setTypeFilter(pill.id as TypeFilter)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? "var(--primary)" : "var(--bg-surface)",
                    color: isSelected ? "var(--text-inverse)" : "var(--text-muted)",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--primary)" : "var(--border-main)",
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Employee Dropdown for Admin */}
          {isAdmin && employees.length > 0 && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-7 px-2.5 rounded-md border text-xs font-medium bg-white dark:bg-card text-gray-800 dark:text-gray-200 cursor-pointer"
              style={{ borderColor: "var(--border-main)" }}
            >
              <option value="All">All Assignees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}

          {/* Switch Back to List View Button */}
          {onSwitchToList && (
            <button
              type="button"
              onClick={onSwitchToList}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
            >
              <ListIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>List View</span>
            </button>
          )}

          {/* Add To-Do Button */}
          {onAddTodo && (
            <button
              type="button"
              onClick={() => onAddTodo()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-[#5551FF] hover:bg-[#4338CA] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add To-Do</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Full Month Calendar Grid (SUN - SAT) */}
      <div className="flex-1 w-full overflow-x-auto">
        <div className="min-w-[850px] w-full flex flex-col">
          {/* Day of Week Headers */}
          <div
            className="grid grid-cols-7 border-b text-[11px] font-bold uppercase tracking-wider text-center py-2.5"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
              color: "var(--text-muted)",
            }}
          >
            {DAY_NAMES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* 42 Calendar Cells (6 weeks x 7 days) */}
          <div
            className="grid grid-cols-7 grid-rows-6"
            style={{ borderColor: "var(--border-main)" }}
          >
            {cells.map((cell) => (
              <CalendarCell
                key={cell.date}
                date={cell.date}
                isCurrentMonth={cell.isCurrentMonth}
                events={eventsByDate.get(cell.date) || []}
                todayStr={todayStr}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onCellClick={() => onAddTodo?.(cell.date)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Selected Event Details Modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};
