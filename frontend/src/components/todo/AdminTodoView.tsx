"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  TrendingUp,
  FileText,
} from "lucide-react";
import { todoApi, TodoSummary } from "@/services/todoApi";
import { AdminAdministrativeTasks } from "./AdminAdministrativeTasks";
import { AdminTeamTasks } from "./AdminTeamTasks";
import { TodoCalendarView } from "./TodoCalendarView";

interface AdminTodoViewProps {
  userName?: string;
}

type AdminTab = "administrative" | "team" | "calendar";

export const AdminTodoView: React.FC<AdminTodoViewProps> = ({ userName }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("administrative");
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const data = await todoApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load to-do summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-main tracking-tight">To-Do & Deadline Management</h1>
          <p className="text-xs text-subtle mt-0.5">
            Administrative statutory deadlines, DSC renewals, license tracking, and team task delegation.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Administrative Tasks */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Administrative Tasks
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-main">
              {summary?.adminTasksTotal ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-subtle">
              <span className="text-red-600 font-semibold">
                {summary?.adminTasksUrgent ?? 0} Urgent / Expired
              </span>
              <span>•</span>
              <span className="text-emerald-600">
                {summary?.adminTasksCompleted ?? 0} Resolved
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Team Tasks */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Active Team Tasks
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-main">
              {summary?.teamTasksActive ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-subtle">
              <span className="text-red-600 font-semibold">
                {summary?.teamTasksOverdue ?? 0} Overdue
              </span>
              <span>•</span>
              <span>In Progress</span>
            </div>
          </div>
        </div>

        {/* Card 3: Team Tasks Completed */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Completed Tasks
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-main">
              {summary?.teamTasksCompleted ?? 0}
            </div>
            <div className="mt-1.5 text-xs text-emerald-600 font-medium">
              Verified & Filed
            </div>
          </div>
        </div>

        {/* Card 4: Average Team Progress */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Team Avg Progress
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-main">
              {summary?.teamAvgProgress ?? 0}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-subtle mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${summary?.teamAvgProgress ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 border-b pb-px"
        style={{ borderColor: "var(--border-main)" }}
      >
        <button
          onClick={() => setActiveTab("administrative")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-[2px] ${
            activeTab === "administrative"
              ? "border-primary text-primary bg-surface"
              : "border-transparent text-subtle hover:text-main"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>My Administrative Tasks</span>
          {summary?.adminTasksTotal !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "administrative"
                  ? "bg-primary/10 text-primary"
                  : "bg-subtle text-subtle"
              }`}
            >
              {summary.adminTasksTotal}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-[2px] ${
            activeTab === "team"
              ? "border-primary text-primary bg-surface"
              : "border-transparent text-subtle hover:text-main"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Tasks</span>
          {summary?.teamTasksActive !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "team"
                  ? "bg-primary/10 text-primary"
                  : "bg-subtle text-subtle"
              }`}
            >
              {summary.teamTasksActive}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-[2px] ${
            activeTab === "calendar"
              ? "border-primary text-primary bg-surface"
              : "border-transparent text-subtle hover:text-main"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar View</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "administrative" && (
          <AdminAdministrativeTasks onRefreshSummary={loadSummary} />
        )}
        {activeTab === "team" && <AdminTeamTasks onRefreshSummary={loadSummary} />}
        {activeTab === "calendar" && <TodoCalendarView />}
      </div>
    </div>
  );
};
