"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { getCalendarEvents } from "@/services/noticeApi";
import { complianceApi } from "@/services/complianceApi";
import { STATUS_CONFIG, getNoticeStatusConfig, COMPLIANCE_STATUS_CONFIG } from "@/lib/statusConfig";
import type {
  CalendarEvent,
  NoticeStatus,
  Portal,
} from "@/types/notices";

type FilterType = "All" | "GST" | "Income Tax" | "TDS";
type ByType = "Notice Date" | "Due Date";

const PORTAL_TO_API: Record<FilterType, Portal | "ALL"> = {
  All: "ALL",
  GST: "GST",
  "Income Tax": "IT",
  TDS: "TDS",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const STATUS_OPTIONS: { value: NoticeStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "response_preparing", label: "Response Preparing" },
  { value: "response_filed", label: "Response Filed" },
  { value: "under_dept_review", label: "Under Dept Review" },
  { value: "hearing_scheduled", label: "Hearing Scheduled" },
  { value: "appeal_filed", label: "Appeal Filed" },
  { value: "closed", label: "Closed" },
  { value: "no_status", label: "No Status" },
];

/** Returns "YYYY-MM" for the given year/month (1-indexed) */
function toMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Build the grid cells for a given year/month. Always 42 cells (6 rows). */
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

interface DayPopoverProps {
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

const DayPopover: React.FC<DayPopoverProps> = ({ date, events, onClose, anchorRef }) => {
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
      className="absolute z-50 left-0 top-full mt-1 w-64 rounded-lg shadow-dropdown border p-3 text-xs"
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

      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {events.map((ev) => {
          const isComp = Boolean(ev.complianceStatus);
          const meta =
            isComp && ev.complianceStatus && ev.complianceStatus in COMPLIANCE_STATUS_CONFIG
              ? COMPLIANCE_STATUS_CONFIG[ev.complianceStatus as "FILED" | "MISSED" | "PENDING"]
              : getNoticeStatusConfig(ev.status);
          const title = isComp ? ev.title : ev.clientName;
          const sub = isComp ? `${ev.portal} • ${meta.label}` : `${ev.portal} • ${ev.title}`;

          return (
            <div
              key={ev.id}
              className="p-1.5 rounded flex flex-col gap-0.5 border"
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium truncate">{title}</span>
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0"
                  style={{
                    backgroundColor: "var(--bg-active)",
                    color: "var(--primary)",
                  }}
                >
                  {meta.label}
                </span>
              </div>
              <span className="text-[10px] truncate" style={{ color: "var(--text-subtle)" }}>
                {sub}
              </span>
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
  events: CalendarEvent[];
  todayStr: string;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  isCurrentMonth,
  events,
  todayStr,
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
      <div className="flex flex-col gap-0.5 flex-1">
        {visible.map((ev) => {
          const isComp = Boolean(ev.complianceStatus);
          const meta =
            isComp && ev.complianceStatus && ev.complianceStatus in COMPLIANCE_STATUS_CONFIG
              ? COMPLIANCE_STATUS_CONFIG[ev.complianceStatus as "FILED" | "MISSED" | "PENDING"]
              : getNoticeStatusConfig(ev.status);
          const badgeText = isComp ? ev.title : ev.clientName;
          return (
            <div
              key={ev.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium truncate leading-4"
              style={{
                backgroundColor: "var(--bg-subtle)",
                color: "var(--text-main)",
                border: "1px solid var(--border-subtle)",
              }}
              title={`${ev.title} — ${meta.label}`}
            >
              <span className="truncate">{badgeText}</span>
            </div>
          );
        })}

        {overflow > 0 && (
          <button
            type="button"
            className="text-[10px] font-semibold text-left px-1.5 py-0.5 rounded hover:underline cursor-pointer transition-colors"
            style={{ color: "var(--primary)" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover((v) => !v);
            }}
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
          anchorRef={cellRef}
        />
      )}
    </div>
  );
};

export interface NoticeCalendarViewProps {
  module?: "notices" | "compliance";
}

export const NoticeCalendarView: React.FC<NoticeCalendarViewProps> = ({ module = "notices" }) => {
  const todayObj = new Date();
  const [viewYear, setViewYear] = useState(todayObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayObj.getMonth() + 1); // 1-indexed

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
  const [noticeBy, setNoticeBy] = useState<ByType>("Notice Date");
  const [statusFilter, setStatusFilter] = useState<NoticeStatus | "ALL">("ALL");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monthStr = toMonthString(viewYear, viewMonth);
      let data: CalendarEvent[] = [];
      if (module === "compliance") {
        const res = await complianceApi.getCalendar({ month: monthStr });
        data = res.data || [];
      } else {
        const portal = PORTAL_TO_API[selectedFilter];
        const by = noticeBy === "Due Date" ? "due_date" : "notice_date";
        const res = await getCalendarEvents({
          month: monthStr,
          portal: portal === "ALL" ? undefined : portal,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          by,
        });
        data = res || [];
      }
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth, selectedFilter, noticeBy, statusFilter, module]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

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

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells = buildCalendarCells(viewYear, viewMonth);

  const eventsByDate = cells.reduce<Record<string, CalendarEvent[]>>((acc, cell) => {
    acc[cell.date] = events.filter((e) => e.date === cell.date);
    return acc;
  }, {});

  const currentStatusLabel =
    statusFilter === "ALL"
      ? "All statuses"
      : (STATUS_CONFIG[statusFilter as NoticeStatus]?.label ?? "All statuses");

  return (
    <div className="flex flex-col w-full flex-1">
      {/* Filter and Control Bar */}
      <div
        className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b text-xs"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-main)" }}
      >
        {/* Left: Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
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
            <span>{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded border hover:opacity-70 transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {loading && (
            <span className="text-[10px] animate-pulse" style={{ color: "var(--text-subtle)" }}>
              Loading…
            </span>
          )}
        </div>

        {/* Right Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {module !== "compliance" && (
            <>
              {/* Status Dropdown */}
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
                    className="absolute z-40 top-full mt-1 left-14 w-44 rounded-md shadow-dropdown border py-1 text-xs"
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
                        className={`w-full text-left px-3 py-1.5 hover:opacity-80 transition-colors ${
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

              {/* Notices By Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="uppercase text-[11px] font-semibold tracking-wider" style={{ color: "var(--text-subtle)" }}>
                  NOTICES BY
                </span>
                <div className="flex items-center gap-1 font-medium">
                  <button
                    type="button"
                    onClick={() => setNoticeBy("Notice Date")}
                    className={`transition-colors cursor-pointer ${
                      noticeBy === "Notice Date" ? "underline font-semibold" : "hover:opacity-80"
                    }`}
                    style={{
                      color: noticeBy === "Notice Date" ? "var(--primary)" : "var(--text-muted)",
                    }}
                  >
                    Notice Date
                  </button>
                  <span style={{ color: "var(--border-main)" }}>|</span>
                  <button
                    type="button"
                    onClick={() => setNoticeBy("Due Date")}
                    className={`transition-colors cursor-pointer ${
                      noticeBy === "Due Date" ? "underline font-semibold" : "hover:opacity-80"
                    }`}
                    style={{
                      color: noticeBy === "Due Date" ? "var(--primary)" : "var(--text-muted)",
                    }}
                  >
                    Due Date
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
                {(["All", "GST", "Income Tax", "TDS"] as FilterType[]).map((pill) => {
                  const isSelected = selectedFilter === pill;
                  return (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => setSelectedFilter(pill)}
                      className="px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? "var(--primary)" : "var(--bg-surface)",
                        color: isSelected ? "var(--text-inverse)" : "var(--text-muted)",
                        border: "1px solid",
                        borderColor: isSelected ? "var(--primary)" : "var(--border-main)",
                      }}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-center text-xs" style={{ color: "var(--danger)" }}>
          {error.message}
        </div>
      )}

      {/* Full Month Calendar Grid (SUN - SAT) */}
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
                events={eventsByDate[cell.date] ?? []}
                todayStr={todayStr}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
