"use client";

import React from "react";
import {
  Play,
  Pause,
  MoreVertical,
  Edit,
  Mail,
  MessageSquare,
} from "lucide-react";
import { TaskItem } from "@/data/taskData";

interface TaskInfoPanelProps {
  task: TaskItem;
  activeRightTab: string;
  setActiveRightTab: (tab: string) => void;
  isTimerRunning: boolean;
  onTimerToggle: () => void;
  timerSaving: boolean;
  timerError: string | null;
  timerSeconds: number;
  formatTimer: (totalSec: number) => string;
  handleStatusChange: (status: string) => Promise<void>;
}

export const TaskInfoPanel: React.FC<TaskInfoPanelProps> = ({
  task,
  activeRightTab,
  setActiveRightTab,
  isTimerRunning,
  onTimerToggle,
  timerSaving,
  timerError,
  timerSeconds,
  formatTimer,
  handleStatusChange,
}) => {
  return (
    <div className="lg:col-span-4 p-4 space-y-4 bg-[var(--bg-muted)]">
      {/* Top Tabs: Info, SOP, Pins, UDIN, Files, Password */}
      <div className="flex items-center space-x-2 border-b border-[var(--border-main)] pb-2 text-xs overflow-x-auto">
        {["Info", "SOP", "Pins", "UDIN", "Files", "Password"].map((tab) => {
          const isActive = activeRightTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveRightTab(tab)}
              style={{
                color: isActive ? "var(--primary)" : undefined,
                borderBottomColor: isActive ? "var(--primary)" : "transparent",
              }}
              className={`pb-1 font-semibold transition-all whitespace-nowrap border-b-2 cursor-pointer ${
                isActive ? "" : "text-[var(--text-subtle)] hover:text-[var(--text-main)]"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Action Buttons: Start Timer, Send for Review, Complete, ⋮ */}
      <div className="flex items-center space-x-2 pt-1">
        {/* Start Timer / Live Stopwatch button */}
        <button
          type="button"
          onClick={onTimerToggle}
          disabled={timerSaving}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-full border transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer ${
            isTimerRunning
              ? "bg-amber-500 text-white border-amber-600 animate-pulse"
              : "bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>{timerSaving ? 'Saving…' : `Stop (${formatTimer(timerSeconds)})`}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span>Start Timer</span>
            </>
          )}
        </button>

        {/* Send for Review */}
        <button
          type="button"
          onClick={() => handleStatusChange("Sent for Review")}
          style={{ backgroundColor: "var(--primary)" }}
          className="py-1.5 px-3 text-xs font-semibold text-white rounded-full shadow-xs transition-colors hover:opacity-90 cursor-pointer"
        >
          Send for Review
        </button>

        {/* Complete */}
        <button
          type="button"
          onClick={() => handleStatusChange("Completed")}
          className="py-1.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-xs transition-colors cursor-pointer"
        >
          Complete
        </button>

        <button
          type="button"
          aria-label="More actions"
          className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-main)] border border-[var(--border-main)] rounded-full cursor-pointer"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      {timerError && <p role="alert" className="text-xs text-red-600">{timerError}</p>}

      {/* Tab Content Switching */}
      {activeRightTab === "SOP" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
              <span>Standard Operating Procedure (SOP)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-soft)] font-medium" style={{ color: "var(--primary)" }}>
              {task.serviceName}
            </span>
          </div>
          <div className="text-[12px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap bg-[var(--bg-subtle)] p-3 rounded border border-[var(--border-main)] min-h-[140px]">
            {task.sop || "Standard operating procedure instructions linked to this service are available for execution. Follow statutory guidelines and checklist verification."}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)] pt-1">
            <strong>Guidelines:</strong> Ensure all mandatory checklist items are validated before marking the task ready for review.
          </div>
        </div>
      )}

      {activeRightTab === "Files" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
            <span className="font-bold text-[var(--text-main)]">Attached Files & Documents</span>
            <span className="text-[10px] text-[var(--text-subtle)]">
              {task.documentRequests?.length || 0} requested
            </span>
          </div>
          {task.documentRequests && task.documentRequests.length > 0 ? (
            <div className="space-y-2">
              {task.documentRequests.map((doc) => (
                <div key={doc.id} className="p-2 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] flex items-center justify-between">
                  <div className="text-[11px] truncate flex-1 pr-2">
                    <p className="font-medium text-[var(--text-main)] truncate">{doc.title}</p>
                    <span className={`text-[10px] ${doc.status === 'Received' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {doc.status}
                    </span>
                  </div>
                  {doc.fileUrl ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold underline"
                      style={{ color: "var(--primary)" }}
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[10px] text-[var(--text-subtle)]">No file</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[var(--text-subtle)] text-[11px]">
              No files or document requests attached to this task.
            </div>
          )}
        </div>
      )}

      {activeRightTab === "Pins" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-2">
          <div className="font-bold text-[var(--text-main)] pb-2 border-b border-[var(--border-main)]">
            Pinned Notes & Reminders
          </div>
          <div className="text-[11px] text-[var(--text-subtle)] p-3 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)]">
            Client PAN: <strong>{task.clientPan || "N/A"}</strong>
            <br />
            Client File No: <strong>{task.clientFileNo || "N/A"}</strong>
            <br />
            Target Due: <strong>{task.targetDueDate}</strong>
          </div>
        </div>
      )}

      {activeRightTab === "UDIN" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-2">
          <div className="font-bold text-[var(--text-main)] pb-2 border-b border-[var(--border-main)]">
            UDIN Generation & Status
          </div>
          <div className="text-[11px] text-[var(--text-subtle)] p-3 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)] space-y-1">
            <p>Status: <strong className="text-[var(--text-main)]">{task.complianceStatus?.referenceNo !== '—' ? 'Generated' : 'Not Generated'}</strong></p>
            <p>Reference: <strong className="text-[var(--text-main)]">{task.complianceStatus?.referenceNo || '—'}</strong></p>
          </div>
        </div>
      )}

      {activeRightTab === "Password" && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs space-y-2">
          <div className="font-bold text-[var(--text-main)] pb-2 border-b border-[var(--border-main)]">
            Portal Access & Credentials
          </div>
          <div className="text-[11px] text-[var(--text-subtle)] p-3 bg-[var(--bg-subtle)] rounded border border-[var(--border-main)]">
            Client authorized credentials stored encrypted in the security vault for portal access.
          </div>
        </div>
      )}

      {activeRightTab === "Info" && (
        <>
          {/* Orange Compliance Status Card matching Image 2 */}
          <div className="bg-[var(--banner-bg)] border border-[var(--banner-border)] text-[var(--banner-text)] rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="flex items-center space-x-1">
                <span>Compliance Status</span>
              </span>
              <Edit className="w-3.5 h-3.5 cursor-pointer hover:opacity-75" />
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
              <div>
                <span className="text-[var(--banner-link)] block opacity-80">PERIOD</span>
                <span className="font-semibold">
                  {task.complianceStatus?.period || task.period}
                </span>
              </div>
              <div>
                <span className="text-[var(--banner-link)] block opacity-80">DUE DATE</span>
                <span className="font-semibold">
                  {task.complianceStatus?.dueDate || task.targetDueDate}
                </span>
              </div>
              <div>
                <span className="text-[var(--banner-link)] block opacity-80">STATUS</span>
                <span
                  className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: "rgba(232, 101, 90, 0.2)",
                    color: "var(--danger)",
                  }}
                >
                  {task.complianceStatus?.status || "Overdue"}
                </span>
              </div>
              <div>
                <span className="text-[var(--banner-link)] block opacity-80">FILED DATE</span>
                <span>—</span>
              </div>
              <div>
                <span className="text-[var(--banner-link)] block opacity-80">REFERENCE NO</span>
                <span>—</span>
              </div>
              <div>
                <span className="text-[var(--banner-link)] block opacity-80">ATTACHMENTS</span>
                <span>—</span>
              </div>
            </div>
          </div>

          {/* 2-Column Metadata Key-Value Grid matching Image 2 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3 text-xs">
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px]">
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TASK NAME
                </span>
                <span className="font-medium text-[var(--text-main)] truncate block">
                  {task.taskName}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  SHARE
                </span>
                <div
                  className="flex items-center space-x-2 pt-0.5"
                  style={{ color: "var(--primary)" }}
                >
                  <Mail className="w-3.5 h-3.5 cursor-pointer hover:opacity-75" />
                  <MessageSquare className="w-3.5 h-3.5 cursor-pointer hover:opacity-75" />
                </div>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TASK ID
                </span>
                <span className="font-bold text-[var(--text-main)] font-mono">
                  {task.taskId}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  SERVICE NAME
                </span>
                <span className="font-semibold text-[var(--text-main)] truncate block">
                  {task.serviceName}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  FREQUENCY
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.frequency}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  FILING PERIOD
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.period}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  CATEGORY
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.category}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  DEPARTMENT
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.department || "GST"}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TASK TYPE
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.taskType}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  FINANCIAL YEAR
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.financialYear}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  CREATED DATE
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.startDate}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  START DATE
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.startDate}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  TARGET DUE
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.targetDueDate}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  END DATE
                </span>
                <span className="text-[var(--text-muted)]">
                  {task.endDate}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  STATUS
                </span>
                <span
                  className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: "var(--brand-soft)",
                    color: "var(--primary)",
                  }}
                >
                  {task.status}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  PRIORITY
                </span>
                <span className="text-emerald-600 font-semibold">
                  {task.priority}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  CREATOR (ADMIN)
                </span>
                <span className="text-[var(--text-main)] font-semibold">
                  {task.creatorName || "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-subtle)] block text-[10px] uppercase font-semibold">
                  SUB STATUS
                </span>
                <span className="text-[var(--text-placeholder)]">—</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
