"use client";

import React from "react";
import { CheckSquare, FolderOpen, Layers, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { TaskItem } from "@/data/taskData";
import { TaskCommentsTab } from "./TaskCommentsTab";

interface TaskSummaryTabProps {
  task: TaskItem;
  handleToggleChecklist: (itemId: string) => Promise<void>;
  handleToggleDocRequest: (docId: string) => Promise<void>;
  commentText: string;
  setCommentText: (val: string) => void;
  isSendingComment: boolean;
  handleSendComment: (e: React.FormEvent) => Promise<void>;
}

export const TaskSummaryTab: React.FC<TaskSummaryTabProps> = ({
  task,
  handleToggleChecklist,
  handleToggleDocRequest,
  commentText,
  setCommentText,
  isSendingComment,
  handleSendComment,
}) => {
  const checklistTotal = task.checklist?.length || 0;
  const checklistCompleted = task.checklist?.filter((c) => c.completed).length || 0;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  const docsTotal = task.documentRequests?.length || 0;
  const docsReceived = task.documentRequests?.filter((d) => d.status === "Received").length || 0;
  const docsPct = docsTotal > 0 ? Math.round((docsReceived / docsTotal) * 100) : 0;

  const subTasksTotal = task.subTasks?.length || 0;
  const subTasksCompleted = task.subTasks?.filter((s) => s.completed).length || 0;
  const subTasksPct = subTasksTotal > 0 ? Math.round((subTasksCompleted / subTasksTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 3 Metric Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Subtasks Progress */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[var(--text-main)] flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Subtasks</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-[var(--text-main)]">
              {subTasksCompleted}/{subTasksTotal} ({subTasksPct}%)
            </span>
          </div>
          <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${subTasksPct}%` }}
            />
          </div>
        </div>

        {/* Checklist Progress */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[var(--text-main)] flex items-center space-x-1">
              <CheckSquare className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span>Checklist</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-[var(--text-main)]">
              {checklistCompleted}/{checklistTotal} ({checklistPct}%)
            </span>
          </div>
          <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${checklistPct}%`, backgroundColor: "var(--primary)" }}
            />
          </div>
        </div>

        {/* Documents Progress */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[var(--text-main)] flex items-center space-x-1">
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Documents</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-[var(--text-main)]">
              {docsReceived}/{docsTotal} ({docsPct}%)
            </span>
          </div>
          <div className="w-full bg-[var(--border-subtle)] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${docsPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Interactive Checklist Accordion / Preview */}
      {checklistTotal > 0 && (
        <div className="border border-[var(--border-main)] rounded-lg p-3 bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)] mb-2">
            <span className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
              <CheckSquare className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
              <span>Execution Checklist Items ({checklistCompleted}/{checklistTotal})</span>
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {task.checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleChecklist(item.id)}
                className="flex items-center justify-between p-2 rounded hover:bg-[var(--bg-subtle)] cursor-pointer text-xs border border-transparent hover:border-[var(--border-subtle)] transition-all"
              >
                <div className="flex items-center space-x-2 truncate flex-1">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-[var(--primary)] border-[var(--border-main)] pointer-events-none"
                  />
                  <span className={`truncate ${item.completed ? "line-through text-[var(--text-placeholder)]" : "text-[var(--text-main)] font-medium"}`}>
                    {item.title}
                  </span>
                </div>
                {item.isMandatory && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                    Required
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embedded Conversation Feed */}
      <div className="pt-2">
        <TaskCommentsTab
          comments={task.comments || []}
          commentText={commentText}
          setCommentText={setCommentText}
          isSendingComment={isSendingComment}
          handleSendComment={handleSendComment}
        />
      </div>
    </div>
  );
};
