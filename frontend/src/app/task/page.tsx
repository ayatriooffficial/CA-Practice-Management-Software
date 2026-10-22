"use client";

import React, { useState } from "react";
import {
  Layers,
  List,
  GitBranch,
  Repeat,
  BarChart3,
  Activity,
  Plus,
} from "lucide-react";
import { TaskSummaryView } from "@/components/tasks/TaskSummaryView";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskDetailView } from "@/components/tasks/TaskDetailView";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { TaskItem } from "@/data/taskData";

export default function TaskPage() {
  const [activeMainTab, setActiveMainTab] = useState<
    "Task Summary" | "Task List" | "Sub Tasks" | "Recurring Schedule" | "Analytics"
  >("Task Summary");

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string | null>(null);

  const MAIN_TABS = [
    { id: "Task Summary", label: "Task Summary", icon: Layers },
    { id: "Task List", label: "Task List", icon: List },
    { id: "Sub Tasks", label: "Sub Tasks", icon: GitBranch },
    { id: "Recurring Schedule", label: "Recurring Schedule", icon: Repeat },
    { id: "Analytics", label: "Analytics", icon: BarChart3 },
  ] as const;

  const handleSelectGroupFromSummary = (assigneeName: string) => {
    setSelectedAssigneeFilter(assigneeName);
    setActiveMainTab("Task List");
  };

  const handleTaskCreated = (_newTask: TaskItem) => {
    setActiveMainTab("Task List");
  };

  return (
    <div className="">
      {/* Detail View Mode */}
      {selectedDetailTaskId ? (
        <TaskDetailView
          taskId={selectedDetailTaskId}
          onBack={() => setSelectedDetailTaskId(null)}
        />
      ) : (
        <>
          {/* Top Main Navigation Header matching Screenshots 3 & 4 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between items-center border-b border-[var(--border-main)] p-2">
            {/* Left Main Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMainTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveMainTab(tab.id);
                      if (tab.id === "Task List") {
                        setSelectedAssigneeFilter(null);
                      }
                    }}
                    style={{
                      color: isActive ? "var(--primary)" : undefined,
                      borderBottomColor: isActive ? "var(--primary)" : "transparent",
                    }}
                    className={`flex items-center space-x-1.5 pb-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap px-1 ${isActive
                      ? ""
                      : "text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Top Actions */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors flex items-center space-x-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                <span>Activity</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddTaskOpen(true)}
                style={{ backgroundColor: "var(--primary)" }}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Main Tab Content */}
          {activeMainTab === "Task Summary" && (
            <TaskSummaryView
              onSelectGroupFilter={handleSelectGroupFromSummary}
            />
          )}

          {activeMainTab === "Task List" && (
            <TaskListView
              onOpenAddTask={() => setIsAddTaskOpen(true)}
              onOpenTaskDetail={(tId) => setSelectedDetailTaskId(tId)}
              selectedAssigneeFilter={selectedAssigneeFilter}
            />
          )}

          {activeMainTab === "Sub Tasks" && (
            <div className="bg-[var(--bg-surface)] rounded-lg p-8 border border-[var(--border-main)] text-center">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-60" style={{ color: "var(--primary)" }} />
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                Sub Tasks Central Management
              </h3>
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                All subtasks from active compliance services and one-time tasks across your team.
              </p>
              <button
                type="button"
                onClick={() => setActiveMainTab("Task List")}
                style={{
                  backgroundColor: "var(--brand-soft)",
                  color: "var(--primary)",
                }}
                className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-md"
              >
                View in Task List
              </button>
            </div>
          )}

          {activeMainTab === "Recurring Schedule" && (
            <div className="bg-[var(--bg-surface)] rounded-lg p-8 border border-[var(--border-main)] text-center">
              <Repeat className="w-8 h-8 mx-auto mb-2 opacity-60" style={{ color: "var(--primary)" }} />
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                Recurring Schedule & Automation
              </h3>
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                Automated monthly, quarterly, and annual task recurrence cycles configured from your Services catalog.
              </p>
            </div>
          )}

          {activeMainTab === "Analytics" && (
            <div className="bg-[var(--bg-surface)] rounded-lg p-8 border border-[var(--border-main)] text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-60" style={{ color: "var(--primary)" }} />
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                Task Performance & TAT Analytics
              </h3>
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                Track team velocity, overdue ratios, turnaround times, and billing readiness.
              </p>
            </div>
          )}
        </>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
