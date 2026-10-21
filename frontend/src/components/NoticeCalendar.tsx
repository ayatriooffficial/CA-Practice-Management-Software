"use client";

import React, { useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Coins,
} from "lucide-react";

type NoticeTab = "Calendar" | "Clients" | "GST Notices" | "TDS Notices" | "IT Notices" | "Logs";
type FilterType = "All" | "GST" | "Income Tax" | "TDS";

export const NoticeCalendar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NoticeTab>("Calendar");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
  const [noticeBy, setNoticeBy] = useState<"Notice Date" | "Due Date">("Notice Date");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  // Calendar dates representation for October 2026 as in screenshot
  // Week days: SUN, MON, TUE, WED, THU, FRI, SAT
  const calendarDays = [
    // Week 1
    { day: 27, isCurrentMonth: false },
    { day: 28, isCurrentMonth: false },
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true },

    // Week 2
    { day: 4, isCurrentMonth: true },
    { day: 5, isCurrentMonth: true },
    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },

    // Week 3 (14 is Today)
    { day: 11, isCurrentMonth: true },
    { day: 12, isCurrentMonth: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true, isToday: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true },

    // Week 4
    { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },

    // Week 5
    { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 31, isCurrentMonth: true },
  ];

  const subTabs: NoticeTab[] = [
    "Calendar",
    "Clients",
    "GST Notices",
    "TDS Notices",
    "IT Notices",
    "Logs",
  ];

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* 1. Page Subheader: Notice Management */}
      <div
        className="px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--text-inverse)",
            }}
          >
            <Bell className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1
              className="text-[17px] font-bold tracking-tight"
              style={{ color: "var(--text-main)" }}
            >
              Notice Management
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              GST • Income Tax • TRACES — all portals unified
            </p>
          </div>
        </div>

        {/* Right side Credits badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all hover:bg-orange-50 cursor-pointer"
            style={{
              backgroundColor: "var(--credits-bg)",
              borderColor: "var(--credits-border)",
              color: "var(--credits-text)",
            }}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="tracking-wide text-[11px]">CREDITS</span>
            <span className="font-bold text-red-600">0</span>
          </button>
        </div>
      </div>

      {/* 2. Secondary Navigation Tabs */}
      <div
        className="px-6 flex items-center gap-6 border-b text-xs font-medium overflow-x-auto no-scrollbar"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        {subTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-3 transition-colors relative whitespace-nowrap cursor-pointer ${
                isActive ? "font-semibold" : "hover:text-gray-900"
              }`}
              style={{
                color: isActive ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {tab}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Filter and Control Bar */}
      <div
        className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b text-xs"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        {/* Left: Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded border font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
          >
            <span>October 2026</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <button
            type="button"
            className="p-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="uppercase text-[11px] font-semibold text-gray-400 tracking-wider">
              STATUS
            </span>
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded border bg-transparent font-medium cursor-pointer"
              style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
            >
              <span>{statusFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Notices By Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="uppercase text-[11px] font-semibold text-gray-400 tracking-wider">
              NOTICES BY
            </span>
            <div className="flex items-center gap-1 font-medium">
              <button
                type="button"
                onClick={() => setNoticeBy("Notice Date")}
                className={`transition-colors cursor-pointer ${
                  noticeBy === "Notice Date" ? "underline font-semibold" : "text-gray-500 hover:text-gray-800"
                }`}
                style={{
                  color: noticeBy === "Notice Date" ? "var(--primary)" : undefined,
                }}
              >
                Notice Date
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setNoticeBy("Due Date")}
                className={`transition-colors cursor-pointer ${
                  noticeBy === "Due Date" ? "underline font-semibold" : "text-gray-500 hover:text-gray-800"
                }`}
                style={{
                  color: noticeBy === "Due Date" ? "var(--primary)" : undefined,
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
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "shadow-xs"
                      : "border hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  style={{
                    backgroundColor: isSelected ? "var(--primary)" : "var(--bg-surface)",
                    color: isSelected ? "var(--text-inverse)" : "var(--text-muted)",
                    borderColor: isSelected ? "var(--primary)" : "var(--border-main)",
                  }}
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Full-bleed Calendar Grid (SUN - SAT) matching original screenshot */}
      <div className="flex-1 w-full overflow-x-auto">
        <div className="min-w-[850px] w-full flex flex-col">
          {/* Day of Week Headers */}
          <div
            className="grid grid-cols-7 border-b text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center py-2.5"
            style={{
              backgroundColor: "var(--cal-header-bg)",
              borderColor: "var(--border-main)",
            }}
          >
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* 35 Calendar Cells (5 weeks x 7 days) */}
          <div
            className="grid grid-cols-7 grid-rows-5 divide-x divide-y border-b"
            style={{ borderColor: "var(--border-main)" }}
          >
            {calendarDays.map((item, index) => (
              <div
                key={index}
                className={`min-h-[110px] p-2.5 flex flex-col justify-between transition-colors relative hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${
                  !item.isCurrentMonth ? "opacity-35" : ""
                }`}
                style={{
                  backgroundColor: item.isToday ? "var(--cal-today-light)" : "transparent",
                  borderColor: "var(--border-main)",
                }}
              >
                {/* Date Header in cell */}
                <div className="flex items-center gap-1.5">
                  {item.isToday ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-xs"
                        style={{
                          backgroundColor: "var(--cal-today-bg)",
                          color: "var(--text-inverse)",
                        }}
                      >
                        {item.day}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--primary)" }}
                      >
                        TODAY
                      </span>
                    </div>
                  ) : (
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: item.isCurrentMonth
                          ? "var(--cal-day-text)"
                          : "var(--cal-day-other)",
                      }}
                    >
                      {item.day}
                    </span>
                  )}
                </div>

                {/* Empty event slot ready for notice events */}
                <div className="mt-1 flex-1 flex flex-col justify-center"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
