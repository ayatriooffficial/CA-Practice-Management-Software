"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Plus,
  Trash2,
} from "lucide-react";
import { taskApi } from "@/services/taskApi";
import { TaskItem } from "@/data/taskData";
import { useAuth } from "@/components/auth/AuthContext";
import { financialApi } from "@/services/financialApi";
import {
  TaskNavigationMenu,
  TaskSubTasksList,
  TaskDetailViewTabs,
  TaskInfoPanel,
} from "./TaskDetailViewTabs";

interface TaskDetailViewProps {
  taskId: string;
  onBack: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  taskId,
  onBack,
}) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || "").toLowerCase() === "employee";

  const [task, setTask] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<string>("Task Summary");
  const [activeRightTab, setActiveRightTab] = useState<string>("Info");

  // Inline Checklist Add State
  const [isAddChecklistInline, setIsAddChecklistInline] = useState<boolean>(false);
  const [checklistTitle, setChecklistTitle] = useState<string>("");

  // Inline Document Request Add State
  const [isAddDocInline, setIsAddDocInline] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>("");

  // Live Timer state
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null);
  const [timerRequestKey, setTimerRequestKey] = useState<string | null>(null);
  const [timerSaving, setTimerSaving] = useState(false);
  const [timerError, setTimerError] = useState<string | null>(null);

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

  const handleTimerToggle = async () => {
    if (!isTimerRunning) {
      setTimerSeconds(0);
      setTimerStartedAt(new Date());
      setTimerRequestKey(crypto.randomUUID());
      setTimerError(null);
      setIsTimerRunning(true);
      return;
    }
    if (!task || !timerStartedAt || !timerRequestKey) {
      setTimerError('The timer session is incomplete. Start the timer again.');
      return;
    }
    if (!currentUser?.id) {
      setTimerError('Sign in before saving task time.');
      return;
    }
    if (timerSeconds <= 0) {
      setIsTimerRunning(false);
      setTimerStartedAt(null);
      setTimerRequestKey(null);
      setTimerError('No elapsed time to record.');
      return;
    }
    setTimerSaving(true);
    setTimerError(null);
    try {
      await financialApi.createTimeEntry({
        taskId: task.taskId,
        workDate: timerStartedAt.toISOString().slice(0, 10),
        durationSeconds: timerSeconds,
        idempotencyKey: timerRequestKey,
      });
      setIsTimerRunning(false);
      setTimerStartedAt(null);
      setTimerRequestKey(null);
      setTimerSeconds(0);
    } catch (error) {
      setTimerError(error instanceof Error ? error.message : 'Task time could not be saved.');
    } finally {
      setTimerSaving(false);
    }
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

  const getTargetId = () => {
    return task?.id || (task as any)?._id || task?.taskId || taskId;
  };

  const handleToggleSubTask = async (subTaskId: string) => {
    if (!task) return;
    const res = await taskApi.toggleSubTask(getTargetId(), subTaskId);
    if (res.data) {
      setTask(res.data);
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!task) return;
    const res = await taskApi.toggleChecklist(getTargetId(), itemId);
    if (res.data) {
      setTask(res.data);
    }
  };

  const handleToggleDocRequest = async (docId: string) => {
    if (!task) return;
    const res = await taskApi.toggleDocumentRequest(getTargetId(), docId);
    if (res.data) {
      setTask(res.data);
    }
  };

  const handleAddChecklist = async () => {
    if (!checklistTitle.trim() || !task) return;
    const newItem = {
      id: `c_${Date.now()}`,
      title: checklistTitle.trim(),
      completed: false,
      isMandatory: true,
    };
    const updatedChecklist = [...(task.checklist || []), newItem];
    const res = await taskApi.updateTask(getTargetId(), { checklist: updatedChecklist });
    if (res.data) {
      setTask(res.data);
    } else {
      setTask({ ...task, checklist: updatedChecklist });
    }
    setChecklistTitle("");
    setIsAddChecklistInline(false);
  };

  const handleDeleteChecklist = async (itemId: string) => {
    if (!task) return;
    const updatedChecklist = (task.checklist || []).filter(
      (c) => c.id !== itemId && (c as any)._id?.toString() !== itemId
    );
    const res = await taskApi.updateTask(getTargetId(), { checklist: updatedChecklist });
    if (res.data) {
      setTask(res.data);
    } else {
      setTask({ ...task, checklist: updatedChecklist });
    }
  };

  const handleAddDocRequest = async () => {
    if (!docTitle.trim() || !task) return;
    const newItem = {
      id: `d_${Date.now()}`,
      title: docTitle.trim(),
      status: "Pending" as const,
      isMandatory: true,
    };
    const updatedDocs = [...(task.documentRequests || []), newItem];
    const res = await taskApi.updateTask(getTargetId(), { documentRequests: updatedDocs });
    if (res.data) {
      setTask(res.data);
    } else {
      setTask({ ...task, documentRequests: updatedDocs });
    }
    setDocTitle("");
    setIsAddDocInline(false);
  };

  const handleDeleteDocRequest = async (docId: string) => {
    if (!task) return;
    const updatedDocs = (task.documentRequests || []).filter(
      (d) => d.id !== docId && (d as any)._id?.toString() !== docId
    );
    const res = await taskApi.updateTask(getTargetId(), { documentRequests: updatedDocs });
    if (res.data) {
      setTask(res.data);
    } else {
      setTask({ ...task, documentRequests: updatedDocs });
    }
  };

  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadDocFile = async (docId: string, file: File, title?: string) => {
    if (!task) return;
    setUploadingDocId(docId);
    setUploadError(null);
    try {
      const res = await taskApi.uploadDocumentRequestFile(getTargetId(), docId, file, title);
      if (res.data?.task) {
        setTask(res.data.task);
      } else {
        const refetched = await taskApi.getTaskById(getTargetId());
        if (refetched.data) setTask(refetched.data);
      }
    } catch (err: any) {
      console.error("Failed to upload document to Google Drive:", err);
      const msg = err?.message || "Google Drive upload failed. File was not stored locally.";
      setUploadError(msg);
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleUploadGeneralFile = async (file: File, title: string) => {
    if (!task) return;
    setUploadError(null);
    try {
      const res = await taskApi.uploadGeneralTaskDocument(getTargetId(), file, title);
      if (res.data?.task) {
        setTask(res.data.task);
      } else {
        const refetched = await taskApi.getTaskById(getTargetId());
        if (refetched.data) setTask(refetched.data);
      }
    } catch (err: any) {
      console.error("Failed to upload general task document to Google Drive:", err);
      const msg = err?.message || "Google Drive upload failed. File was not stored locally.";
      setUploadError(msg);
      throw err;
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
        currentUser?.name ? `${currentUser.name} (${currentUser.role || "Staff"})` : "Staff",
        currentUser?.initials || "ST",
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

  const handleGenerateInvoice = () => {
    if (!task) return;
    const trackedTimerHrs = timerSeconds > 0 ? Number((timerSeconds / 3600).toFixed(2)) : (Number(task.trackedHours) || 3.5);
    const hourlyBilling = Math.round(trackedTimerHrs * (Number(task.hourlyRate) || 1200));
    const serviceBaseFee = Number(task.serviceFee) || 5000;
    const totalProfessionalFee = serviceBaseFee + hourlyBilling;

    const draftInvoice = {
      type: "invoice",
      taskId: task.taskId,
      clientBusinessName: task.clientName,
      clientLegalName: task.legalName || task.clientName,
      clientId: task.clientId || "client-prefilled",
      clientGroup: task.groupName || "Clients",
      clientGstin: task.clientGstin || "",
      clientAddress: task.clientAddress || "",
      placeOfSupply: "27-Maharashtra",
      date: new Date().toLocaleDateString("en-GB"),
      dueDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB"),
      subTotal: totalProfessionalFee + (task.reimbursements ? 1500 : 0),
      totalPayable: totalProfessionalFee + (task.reimbursements ? 1500 : 0),
      services: [
        {
          id: "srv-from-task-1",
          serviceName: task.serviceName || task.taskName,
          description: `Professional execution fees for ${task.serviceName || task.taskName} (${trackedTimerHrs} hrs tracked @ ₹${task.hourlyRate || 1200}/hr + base fee ₹${serviceBaseFee})`,
          compliancePeriod: task.period || "FY 2026-27",
          frequency: task.frequency || "Monthly",
          periodLabel: task.period || "FY 2026-27",
          quantity: 1,
          price: totalProfessionalFee,
          amount: totalProfessionalFee,
          total: totalProfessionalFee,
        },
        ...(task.reimbursements
          ? [
              {
                id: "srv-from-task-reimb",
                serviceName: "Statutory MCA/ROC Filing Fee",
                description: "Government portal statutory charges",
                compliancePeriod: task.period || "FY 2026-27",
                frequency: "One-Time",
                periodLabel: "One-Time",
                quantity: 1,
                price: 1500,
                amount: 1500,
                total: 1500,
              },
            ]
          : []),
      ],
      notes: `Pre-filled from task ${task.taskId} - ${task.taskName}. Client: ${task.clientName}.`,
    };

    sessionStorage.setItem("turia_draft_invoice_from_task", JSON.stringify(draftInvoice));
    router.push("/invoice?fromTask=1");
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
    <div className="bg-[var(--bg-surface)] shadow-xs overflow-hidden">
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
            <span>
              {task.clientName && !/^[0-9a-fA-F]{24}$/.test(task.clientName)
                ? task.clientName
                : (task.legalName && !/^[0-9a-fA-F]{24}$/.test(task.legalName)
                    ? task.legalName
                    : (task.clientFileNo ? `Client #${task.clientFileNo}` : "Client Details"))}
            </span>
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

          {task.creatorName && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
              style={{
                backgroundColor: "var(--brand-soft)",
                color: "var(--primary)",
              }}
            >
              Admin: {task.creatorName}
            </span>
          )}
      </div>

      {/* 3-Column Layout matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Sub-Modules Navigation (3 cols) */}
        <div className="lg:col-span-3 border-r border-[var(--border-main)] p-3 space-y-4 bg-[var(--bg-muted)]">
          <TaskNavigationMenu
            task={task}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            checklistCompleted={checklistCompleted}
            docsReceived={docsReceived}
          />
          <TaskSubTasksList
            subTasks={task.subTasks}
            handleToggleSubTask={handleToggleSubTask}
          />
        </div>

        {/* Center Column: Interactive Views & Comment Conversation Feed (5 cols) */}
        <div className="lg:col-span-5 border-r border-[var(--border-main)] flex flex-col justify-between p-4">
          <TaskDetailViewTabs
            activeSubTab={activeSubTab}
            task={task}
            isAddChecklistInline={isAddChecklistInline}
            setIsAddChecklistInline={setIsAddChecklistInline}
            checklistTitle={checklistTitle}
            setChecklistTitle={setChecklistTitle}
            handleAddChecklist={handleAddChecklist}
            handleToggleChecklist={handleToggleChecklist}
            handleDeleteChecklist={handleDeleteChecklist}
            isAddDocInline={isAddDocInline}
            setIsAddDocInline={setIsAddDocInline}
            docTitle={docTitle}
            setDocTitle={setDocTitle}
            handleAddDocRequest={handleAddDocRequest}
            handleToggleDocRequest={handleToggleDocRequest}
            handleDeleteDocRequest={handleDeleteDocRequest}
            handleUploadDocFile={handleUploadDocFile}
            handleUploadGeneralFile={handleUploadGeneralFile}
            uploadingDocId={uploadingDocId}
            uploadError={uploadError}
            commentText={commentText}
            setCommentText={setCommentText}
            isSendingComment={isSendingComment}
            handleSendComment={handleSendComment}
            onTaskUpdated={(updated) => setTask(updated)}
          />
        </div>

        {/* Right Column: Metadata, Compliance Card, and Action Controls (4 cols) */}
        <TaskInfoPanel
          task={task}
          activeRightTab={activeRightTab}
          setActiveRightTab={setActiveRightTab}
          isTimerRunning={isTimerRunning}
          onTimerToggle={() => void handleTimerToggle()}
          timerSaving={timerSaving}
          timerError={timerError}
          timerSeconds={timerSeconds}
          formatTimer={formatTimer}
          handleStatusChange={handleStatusChange}
          onGenerateInvoice={handleGenerateInvoice}
          isEmployee={isEmployee}
          onTaskUpdated={(updated) => setTask(updated)}
        />
      </div>
      </div>
  );
};
