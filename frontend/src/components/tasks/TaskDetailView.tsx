"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  Play,
  Pause,
  Send,
  Paperclip,
  Smile,
  Mail,
  MessageSquare,
  MoreVertical,
  DollarSign,
  Receipt,
  FileCheck,
  FolderOpen,
  Edit,
  CheckSquare,
  Layers,
} from "lucide-react";
import { taskApi } from "@/services/taskApi";
import { TaskItem } from "@/data/taskData";

interface TaskDetailViewProps {
  taskId: string;
  onBack: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  taskId,
  onBack,
}) => {
  const [task, setTask] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<string>("Task Summary");
  const [activeRightTab, setActiveRightTab] = useState<string>("Info");

  // Live Timer state
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  // New Comment state
  const [commentText, setCommentText] = useState<string>("");
  const [isSendingComment, setIsSendingComment] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const fetchTaskDetails = async () => {
    setIsLoading(true);
    try {
      const res = await taskApi.getTaskById(taskId);
      if (res.data) {
        setTask(res.data);
      }
    } catch {
      // Handled in api fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const handleToggleSubTask = async (subTaskId: string) => {
    if (!task) return;
    const res = await taskApi.toggleSubTask(task.id, subTaskId);
    if (res.data) {
      setTask(res.data);
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!task) return;
    const res = await taskApi.toggleChecklist(task.id, itemId);
    if (res.data) {
      setTask(res.data);
    }
  };

  const handleToggleDocRequest = async (docId: string) => {
    if (!task) return;
    const res = await taskApi.toggleDocumentRequest(task.id, docId);
    if (res.data) {
      setTask(res.data);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !task) return;

    setIsSendingComment(true);
    try {
      const res = await taskApi.addComment(
        task.id,
        commentText.trim(),
        "Dipak Sahani (Admin)",
        "DS",
        "var(--primary)"
      );
      if (res.data) {
        setTask(res.data);
        setCommentText("");
      }
    } catch {
      //
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!task) return;
    const res = await taskApi.updateTask(task.id, { status: newStatus });
    if (res.data) {
      setTask(res.data);
    }
  };

  if (isLoading || !task) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-lg p-12 text-center border border-[var(--border-main)]">
        <Clock className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto mb-2" />
        <p className="text-xs text-[var(--text-subtle)]">Loading task details...</p>
      </div>
    );
  }

  const checklistCompleted = task.checklist.filter((c) => c.completed).length;
  const docsReceived = task.documentRequests.filter((d) => d.status === "Received").length;

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)] shadow-xs overflow-hidden">
      {/* Top Header Bar matching Image 2 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-main)] bg-[var(--bg-muted)]">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-semibold hover:underline transition-colors"
            style={{ color: "var(--primary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{task.clientName}</span>
          </button>
          <span className="text-[var(--border-main)]">|</span>
          <div className="flex items-center space-x-2">
            <span
              className="font-mono text-xs font-semibold"
              style={{ color: "var(--primary)" }}
            >
              {task.taskId}
            </span>
            <span className="text-[var(--text-subtle)]">-</span>
            <span className="text-xs font-bold text-[var(--text-main)]">
              {task.serviceName}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
            style={{
              backgroundColor: "var(--brand-soft)",
              color: "var(--primary)",
            }}
          >
            Admin: {task.creatorName || "Dipak Sahani"}
          </span>
        </div>
      </div>

      {/* 3-Column Layout matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Sub-Modules Navigation (3 cols) */}
        <div className="lg:col-span-3 border-r border-[var(--border-main)] p-3 space-y-4 bg-[var(--bg-muted)]">
          <nav className="space-y-0.5 text-xs">
            {/* Task Summary */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Task Summary")}
              style={{
                backgroundColor:
                  activeSubTab === "Task Summary" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Task Summary" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4" />
                <span>Task Summary</span>
              </div>
              <div className="flex items-center space-x-1 text-[9px] font-bold">
                <span className="px-1 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  NB
                </span>
                <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  NP
                </span>
                <span className="px-1 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                  NF
                </span>
              </div>
            </button>

            {/* Timesheet */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Timesheet")}
              style={{
                backgroundColor:
                  activeSubTab === "Timesheet" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Timesheet" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Timesheet</span>
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] font-mono">0</span>
            </button>

            {/* Expenses */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Expenses")}
              style={{
                backgroundColor:
                  activeSubTab === "Expenses" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Expenses" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Expenses (OP)</span>
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] font-mono">0</span>
            </button>

            {/* Invoice */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Invoice")}
              style={{
                backgroundColor:
                  activeSubTab === "Invoice" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Invoice" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>Invoice</span>
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] font-mono">0</span>
            </button>

            {/* Linked Emails */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Linked Emails")}
              style={{
                backgroundColor:
                  activeSubTab === "Linked Emails" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Linked Emails" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Linked Emails</span>
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] font-mono">0</span>
            </button>

            {/* Linked WhatsApp */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Linked WhatsApp")}
              style={{
                backgroundColor:
                  activeSubTab === "Linked WhatsApp" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Linked WhatsApp" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Linked WhatsApp</span>
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] font-mono">0</span>
            </button>

            {/* Checklist */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Checklist")}
              style={{
                backgroundColor:
                  activeSubTab === "Checklist" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Checklist" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4" />
                <span>Checklist</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
                {checklistCompleted}/{task.checklist.length}
              </span>
            </button>

            {/* Document Request */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Document Request")}
              style={{
                backgroundColor:
                  activeSubTab === "Document Request" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Document Request" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4" />
                <span>Document Request</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
                {docsReceived}/{task.documentRequests.length}
              </span>
            </button>

            {/* Audit Trail */}
            <button
              type="button"
              onClick={() => setActiveSubTab("Audit Trail")}
              style={{
                backgroundColor:
                  activeSubTab === "Audit Trail" ? "var(--brand-soft)" : "transparent",
                color:
                  activeSubTab === "Audit Trail" ? "var(--primary)" : "var(--text-main)",
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4" />
                <span>Audit Trail</span>
              </div>
            </button>
          </nav>

          {/* Sub Tasks Section matching Image 2 */}
          <div className="pt-2 border-t border-[var(--border-main)]">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-main)]">
                <span>Sub Tasks</span>
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: "var(--brand-soft)",
                    color: "var(--primary)",
                  }}
                >
                  {task.subTasks.length}
                </span>
              </div>
              <button
                type="button"
                aria-label="More options"
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-0.5"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {task.subTasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleToggleSubTask(st.id)}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded text-[var(--primary)] border-[var(--border-main)] pointer-events-none"
                    />
                    <span
                      className={`${
                        st.completed
                          ? "line-through text-[var(--text-placeholder)]"
                          : "text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors"
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-[var(--text-subtle)] group-hover:text-[var(--primary)]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Views & Comment Conversation Feed (5 cols) */}
        <div className="lg:col-span-5 border-r border-[var(--border-main)] flex flex-col justify-between p-4">
          <div className="space-y-4">
            {activeSubTab === "Checklist" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
                  <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                    <CheckSquare className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span>Service Checklists ({task.checklist.length})</span>
                  </h3>
                  <span className="text-[11px] text-[var(--text-subtle)]">All mandatory for compliance</span>
                </div>
                <div className="space-y-2">
                  {task.checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      className="flex items-start space-x-2.5 p-2.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}}
                        className="w-4 h-4 mt-0.5 rounded text-[var(--primary)] border-[var(--border-main)] pointer-events-none"
                      />
                      <div className="text-xs">
                        <p
                          className={`font-medium ${
                            item.completed
                              ? "line-through text-[var(--text-placeholder)]"
                              : "text-[var(--text-main)]"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-[var(--text-subtle)]">
                          Inherited from Service: {task.serviceName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeSubTab === "Document Request" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
                  <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                    <FolderOpen className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span>Required Documents ({task.documentRequests.length})</span>
                  </h3>
                  <span className="text-[11px] text-[var(--text-subtle)]">Linked Service Documents</span>
                </div>
                <div className="space-y-2">
                  {task.documentRequests.map((doc) => {
                    const isReceived = doc.status === "Received";
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]"
                      >
                        <div className="text-xs">
                          <p className="font-semibold text-[var(--text-main)]">
                            {doc.title}
                          </p>
                          <span className="text-[10px] text-[var(--text-subtle)]">
                            Status:{" "}
                            <strong
                              className={
                                isReceived ? "text-emerald-500" : "text-amber-500"
                              }
                            >
                              {doc.status}
                            </strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDocRequest(doc.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                            isReceived
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200"
                              : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-main)]"
                          }`}
                        >
                          {isReceived ? "Mark Pending" : "Mark Received"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Comments Feed matching Image 2 */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
                  <h3 className="text-xs font-bold text-[var(--text-main)]">
                    Add Comment
                  </h3>
                  <span className="text-[11px] text-[var(--text-subtle)]">
                    Task Discussion & Notes
                  </span>
                </div>

                {/* Comment Box */}
                <form onSubmit={handleSendComment} className="relative">
                  <textarea
                    rows={3}
                    placeholder="Type a comment or instruction..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        aria-label="Add attachment"
                        className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Add emoji"
                        className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingComment || !commentText.trim()}
                      style={{ backgroundColor: "var(--primary)" }}
                      className="px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 rounded-md transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center space-x-1"
                    >
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>

                {/* Conversation Thread */}
                <div className="space-y-3 pt-3">
                  {task.comments.length === 0 ? (
                    <div className="py-12 text-center text-[var(--text-placeholder)]">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold text-[var(--text-muted)]">
                        No comments yet
                      </p>
                      <p className="text-[11px]">
                        Be the first to start the conversation
                      </p>
                    </div>
                  ) : (
                    task.comments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span
                              style={{
                                backgroundColor: "var(--brand-soft)",
                                color: "var(--primary)",
                              }}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                            >
                              {c.authorInitials || "DS"}
                            </span>
                            <span className="font-semibold text-[var(--text-main)]">
                              {c.author}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-subtle)]">
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[var(--text-muted)] pl-7">
                          {c.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata, Compliance Card, and Action Controls (4 cols) */}
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
                  className={`pb-1 font-semibold transition-all whitespace-nowrap border-b-2 ${
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
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-full border transition-all flex items-center justify-center space-x-1.5 shadow-xs ${
                isTimerRunning
                  ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                  : "bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Stop ({formatTimer(timerSeconds)})</span>
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
              className="py-1.5 px-3 text-xs font-semibold text-white rounded-full shadow-xs transition-colors hover:opacity-90"
            >
              Send for Review
            </button>

            {/* Complete */}
            <button
              type="button"
              onClick={() => handleStatusChange("Completed")}
              className="py-1.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-xs transition-colors"
            >
              Complete
            </button>

            <button
              type="button"
              aria-label="More actions"
              className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-main)] border border-[var(--border-main)] rounded-full"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

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
                  {task.creatorName || "Dipak Sahani"}
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
        </div>
      </div>
    </div>
  );
};
