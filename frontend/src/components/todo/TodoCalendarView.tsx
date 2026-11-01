"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
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
            className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors"
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
            className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-subtle transition-colors"
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
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  isCurrentMonth,
  events,
  todayStr,
  onSelectEvent,
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
      className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors relative border ${
        !isCurrentMonth ? "opacity-35" : ""
      }`}
      style={{
        backgroundColor: isToday ? "var(--bg-active)" : "var(--bg-surface)",
        borderColor: "var(--border-main)",
      }}
    >
      {/* Day number */}
      <div className="flex items-center gap-1.5 mb-1">
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
              className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium border truncate transition-opacity hover:opacity-85 ${badgeClasses}`}
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
            className="text-[10px] font-semibold text-primary hover:underline text-left mt-0.5"
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

interface TodoCalendarViewProps {
  initialEmployeeFilter?: string;
  isAdmin?: boolean;
}

export const TodoCalendarView: React.FC<TodoCalendarViewProps> = ({
  initialEmployeeFilter = "All",
  isAdmin = false,
}) => {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  const [events, setEvents] = useState<TodoCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeFilter);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TodoCalendarEvent | null>(null);

  const monthStr = toMonthString(currentYear, currentMonth);

  // Sync initial employee filter if changed externally
  useEffect(() => {
    if (initialEmployeeFilter) {
      setEmployeeFilter(initialEmployeeFilter);
    }
  }, [initialEmployeeFilter]);

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

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (typeFilter !== "All") {
        if (typeFilter === "personal_todo" && ev.type !== "personal_todo") return false;
        if (typeFilter === "admin_deadline" && ev.type !== "admin_deadline") return false;
        if (typeFilter === "task_due" && ev.type !== "task_due" && ev.type !== "task_start") return false;
      }
      if (statusFilter !== "All") {
        if (statusFilter === "Completed" && !ev.isCompleted) return false;
        if (statusFilter === "Overdue" && !ev.isOverdue) return false;
        if (statusFilter === "Pending" && (ev.isCompleted || ev.isOverdue)) return false;
      }
      return true;
    });
  }, [events, typeFilter, statusFilter]);

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

  return (
    <div
      className="w-full rounded-xl border p-4 sm:p-6"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-main)",
      }}
    >
      {/* Top Header / Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: "var(--border-main)" }}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-main">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <div className="flex items-center gap-1 border rounded-lg p-0.5" style={{ borderColor: "var(--border-main)" }}>
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-0.5 text-xs font-semibold rounded-md hover:bg-subtle transition-colors"
              style={{ color: "var(--primary)" }}
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Filter (Admin or Team view) */}
          {(isAdmin || employees.length > 0) && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
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

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Types</option>
            <option value="admin_deadline">Admin Deadlines</option>
            <option value="task_due">Assigned Tasks</option>
            <option value="personal_todo">Personal To-Dos</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-hidden bg-surface text-main"
            style={{ borderColor: "var(--border-main)" }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending / Upcoming</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
          </select>

          {isLoading && (
            <span className="text-xs text-subtle animate-pulse">Loading...</span>
          )}
        </div>
      </div>

      {/* Day Headers (SUN - SAT) */}
      <div className="grid grid-cols-7 border-t border-l border-r mt-4 rounded-t-lg overflow-hidden" style={{ borderColor: "var(--border-main)" }}>
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-bold tracking-wider uppercase border-r last:border-r-0"
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderColor: "var(--border-main)",
              color: "var(--text-subtle)",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid (42 cells) */}
      <div className="grid grid-cols-7 border-l border-b rounded-b-lg overflow-hidden" style={{ borderColor: "var(--border-main)" }}>
        {cells.map((cell) => (
          <CalendarCell
            key={cell.date}
            date={cell.date}
            isCurrentMonth={cell.isCurrentMonth}
            events={eventsByDate.get(cell.date) || []}
            todayStr={todayStr}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        ))}
      </div>

      {/* Selected Event Details Modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};
