"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { todoApi, TodoSummary } from "@/services/todoApi";
import { EmployeeTaskList } from "./EmployeeTaskList";
import { TodoCalendarView } from "./TodoCalendarView";

interface EmployeeTodoViewProps {
  userName?: string;
}

type EmployeeTab = "my-tasks" | "calendar";

export const EmployeeTodoView: React.FC<EmployeeTodoViewProps> = ({ userName }) => {
  const [activeTab, setActiveTab] = useState<EmployeeTab>("my-tasks");
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const data = await todoApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load employee to-do summary:", err);
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
          <h1 className="text-2xl font-bold text-main tracking-tight">My Tasks & To-Do</h1>
          <p className="text-xs text-subtle mt-0.5">
            Your assigned client tasks, checklist deliverables, deadline schedules, and progress reporting.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assigned */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Assigned Tasks
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-main">
              {summary?.assignedTotal ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-subtle">
              <span className="text-blue-600 font-semibold">
                {summary?.assignedInProgress ?? 0} In Progress
              </span>
              <span>•</span>
              <span>{summary?.assignedPending ?? 0} Pending</span>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Tasks */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Overdue Deadlines
            </span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-red-600">
              {summary?.assignedOverdue ?? 0}
            </div>
            <div className="mt-1.5 text-xs text-subtle">Requires immediate action</div>
          </div>
        </div>

        {/* Card 3: Completed Tasks */}
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
            <div className="text-2xl font-bold text-emerald-600">
              {summary?.assignedCompleted ?? 0}
            </div>
            <div className="mt-1.5 text-xs text-emerald-600 font-medium">All deliverables met</div>
          </div>
        </div>

        {/* Card 4: Overall Progress */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Overall Progress
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-main">
              {summary?.overallProgress ?? 0}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-subtle mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${summary?.overallProgress ?? 0}%` }}
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
          onClick={() => setActiveTab("my-tasks")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-[2px] ${
            activeTab === "my-tasks"
              ? "border-primary text-primary bg-surface"
              : "border-transparent text-subtle hover:text-main"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>My Tasks</span>
          {summary?.assignedTotal !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "my-tasks"
                  ? "bg-primary/10 text-primary"
                  : "bg-subtle text-subtle"
              }`}
            >
              {(summary.assignedTotal || 0) - (summary.assignedCompleted || 0)}
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
        {activeTab === "my-tasks" && <EmployeeTaskList onRefreshSummary={loadSummary} />}
        {activeTab === "calendar" && <TodoCalendarView />}
      </div>
    </div>
  );
};
