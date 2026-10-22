"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Bell, Coins } from "lucide-react";
import { getCredits, getSyncJobs } from "@/services/noticeApi";
import { onSyncCompleted } from "@/lib/syncEvents";
import { NoticeCalendarView } from "./NoticeCalendarView";
import { GstNotices } from "./GstNotices";
import { TdsNotices } from "./TdsNotices";
import { ItNotices } from "./ItNotices";
import { ClientsTab } from "./ClientsTab";
import { LogsTab } from "./LogsTab";

export const NOTICE_TABS = [
  "Calendar",
  "Clients",
  "GST Notices",
  "TDS Notices",
  "IT Notices",
  "Logs",
] as const;

export type NoticeTab = (typeof NOTICE_TABS)[number];

const TAB_TO_SLUG: Record<NoticeTab, string> = {
  Calendar: "calendar",
  Clients: "clients",
  "GST Notices": "gst-notices",
  "TDS Notices": "tds-notices",
  "IT Notices": "it-notices",
  Logs: "logs",
};

export function parseTabFromQuery(param: string | null): NoticeTab {
  if (!param) return "Calendar";
  const clean = decodeURIComponent(param).trim().toLowerCase();
  for (const tab of NOTICE_TABS) {
    if (tab.toLowerCase() === clean) return tab;
    if (TAB_TO_SLUG[tab] === clean) return tab;
    if (tab.toLowerCase().replace(/\s+/g, "-") === clean) return tab;
    if (tab.toLowerCase().replace(/\s+/g, "_") === clean) return tab;
  }
  return "Calendar";
}

function formatLastSyncDate(dateStr?: string): string {
  if (!dateStr) return "Not synced";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not synced";

  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export const NoticesShell: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab = parseTabFromQuery(tabParam);

  const [credits, setCredits] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const loadCreditsAndJobs = () => {
      Promise.all([getCredits(), getSyncJobs()])
        .then(([creditsData, jobs]) => {
          if (!mounted) return;
          if (creditsData && typeof creditsData.credits === "number") {
            setCredits(creditsData.credits);
          }
          if (jobs && jobs.length > 0) {
            const syncDate = jobs[0].finishedAt || jobs[0].startedAt;
            if (syncDate) {
              setLastSync(formatLastSyncDate(syncDate));
            }
          }
        })
        .catch(() => {});
    };

    loadCreditsAndJobs();
    const unsubscribe = onSyncCompleted(() => {
      loadCreditsAndJobs();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleTabClick = (tab: NoticeTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", TAB_TO_SLUG[tab]);
    router.push(`${pathname}?${params.toString()}`);
  };

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
            <p
              className="text-xs font-medium"
              style={{ color: "var(--text-subtle)" }}
            >
              GST • Income Tax • TRACES — all portals unified
            </p>
          </div>
        </div>

        {/* Right side Last sync and Credits badge */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "var(--text-subtle)" }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: "var(--status-online)" }}
            />
            <span>
              Last sync:{" "}
              <span style={{ color: "var(--text-main)" }}>
                {lastSync || "Not synced"}
              </span>
            </span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer"
            style={{
              backgroundColor: "var(--credits-bg)",
              borderColor: "var(--credits-border)",
              color: "var(--credits-text)",
            }}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="tracking-wide text-[11px]">CREDITS</span>
            <span className="font-bold">
              {credits === null ? "—" : credits.toLocaleString()}
            </span>
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
        {NOTICE_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              className="py-3 transition-colors relative whitespace-nowrap cursor-pointer"
              style={{
                color: isActive ? "var(--primary)" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 500,
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

      {/* Tab Body */}
      <div className="flex-1 flex flex-col w-full">
        {activeTab === "Calendar" && <NoticeCalendarView />}
        {activeTab === "Clients" && <ClientsTab />}
        {activeTab === "GST Notices" && <GstNotices />}
        {activeTab === "TDS Notices" && <TdsNotices />}
        {activeTab === "IT Notices" && <ItNotices />}
        {activeTab === "Logs" && <LogsTab module="notices" />}
      </div>
    </div>
  );
};
