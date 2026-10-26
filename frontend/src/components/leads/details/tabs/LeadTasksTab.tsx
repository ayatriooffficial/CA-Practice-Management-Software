"use client";

import React, { memo, useState } from "react";
import { Plus, Mail, MessageCircle, MoreVertical, Calendar, Clock, User, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { Lead, LeadFollowUpTask } from "@/data/crmData";
import { useLeadTasks, useUpdateLeadTask, useDeleteLeadTask } from "@/hooks/useLeadsQuery";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { ComposeModal } from "@/components/email/ComposeModal";

interface LeadTasksTabProps {
  lead: Lead;
  onOpenAddTask: () => void;
  onEditTask?: (task: any) => void;
}

export const LeadTasksTab = memo(({ lead, onOpenAddTask, onEditTask }: LeadTasksTabProps) => {
  const { data: tasks = [], isLoading } = useLeadTasks(lead.id);
  const updateTaskMutation = useUpdateLeadTask();
  const deleteTaskMutation = useDeleteLeadTask();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Helper date formatter
  const formatTaskDate = (d?: string | Date) => {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime())
        ? String(d)
        : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(d);
    }
  };

  const handleToggleStatus = async (task: any) => {
    const newStatus = task.status === "Completed" ? "Pending" : "Completed";
    await updateTaskMutation.mutateAsync({
      leadId: lead.id,
      taskId: task.id || task._id,
      data: { status: newStatus },
    });
  };

  const handleDelete = (taskId: string) => {
    setActiveMenuId(null);
    setDeleteTaskId(taskId);
  };

  const handleWhatsAppClick = (phone?: string) => {
    const rawNumber = (phone || lead.mobile || "").replace(/[^0-9]/g, "");
    if (!rawNumber) {
      alert("No phone number available for WhatsApp.");
      return;
    }
    const intlNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
    window.open(`https://wa.me/${intlNumber}`, "_blank");
  };

  const handleOpenEmailCompose = (task: any) => {
    const to = task?.contactEmail || lead.email || "";
    const clientName = lead.fullName || lead.businessName || "Client";
    const taskTitle = task?.title || "Follow-up consultation";
    const subject = `Follow-up: ${taskTitle} - ${lead.businessName || clientName}`;
    const notesContent = task?.notes ? `Notes: ${task.notes}\n\n` : "";

    const body = `Dear ${clientName},

I hope this email finds you well.

I am following up regarding: ${taskTitle}.

${notesContent}Please let us know if you have any questions or when would be a convenient time to connect.

Best regards,
Ayatrio Practice`;

    setComposeData({ to, subject, body });
    setIsComposeOpen(true);
  };

  const handleSendEmail = async (params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
  }) => {
    setSendingEmail(true);
    try {
      const { send } = await import("@/lib/integrations/gmail");
      await send(params);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send email.",
      };
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0] dark:border-[#334155]">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Follow-up Tasks ({tasks.length})
        </h2>

        <button
          type="button"
          onClick={onOpenAddTask}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
          style={{ backgroundColor: "var(--premium-blue-dark)" }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && tasks.length === 0 && (
        <div className="py-12 text-center text-xs text-gray-400">
          Loading follow-up tasks...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <div className="py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-2">
          <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            No follow-up tasks yet
          </h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Schedule a call, email, or meeting follow-up with {lead.fullName} to stay on track.
          </p>
          <button
            type="button"
            onClick={onOpenAddTask}
            className="mt-2 text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline cursor-pointer"
          >
            + Create First Follow-up
          </button>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3.5">
        {tasks.map((task: any) => {
          const taskId = task.id || task._id;
          const isCompleted = task.status === "Completed";
          const taskDate = formatTaskDate(task.taskDate || task.createdAt);
          const createdDate = formatTaskDate(task.createdAt || task.taskDate);

          return (
            <div
              key={taskId}
              className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-4.5 transition-all shadow-sm hover:shadow-md space-y-3.5"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {taskDate}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    <span>{task.status || "Pending"}</span>
                  </button>
                </div>

                {/* 3-dots actions menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(activeMenuId === taskId ? null : taskId)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === taskId && (
                    <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#1e293b] rounded-lg shadow-dropdown border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          handleToggleStatus(task);
                        }}
                        className="w-full text-left px-3.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        Mark as {isCompleted ? "Pending" : "Completed"}
                      </button>
                      {onEditTask && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditTask(task);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          Edit Task
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          handleDelete(taskId);
                        }}
                        className="w-full text-left px-3.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        Delete Task
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Title */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {task.title}
                </h3>
                {task.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {task.notes}
                  </p>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700/60">
                {/* Assignee */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Assignee
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-5 h-5 rounded-full bg-[#31719B]/10 text-[#31719B] dark:bg-[#31719B]/30 dark:text-[#93c5fd] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {task.assigneeInitials || (task.assigneeName ? task.assigneeName.slice(0, 2).toUpperCase() : "—")}
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                      {task.assigneeName || "Unassigned"}
                    </span>
                  </div>
                </div>

                {/* Start Time */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Start Time
                  </div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {task.startTime || "-"}
                  </div>
                </div>

                {/* End Time */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    End Time
                  </div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {task.endTime || "-"}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Priority
                  </div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mt-1">
                    {task.priority || "Medium"}
                  </div>
                </div>

                {/* Contact Method */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Contact Method
                  </div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {task.contactMethod || "Call"}
                  </div>
                </div>

                {/* Outcome */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Outcome
                  </div>
                  <div className="font-semibold text-[#31719B] dark:text-[#60a5fa] mt-1">
                    {task.outcome || "—"}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{task.author || "Staff"}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Created On {createdDate}</span>
                  </span>
                </div>

                {/* Quick Contact Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-gray-400">Contact via</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEmailCompose(task)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#31719B]" />
                    <span className="font-medium">Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWhatsAppClick(task.contactPhone)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium">WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={Boolean(deleteTaskId)}
        title="Delete Follow-up Task?"
        message="Are you sure you want to delete this follow-up task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={async () => {
          if (deleteTaskId) {
            await deleteTaskMutation.mutateAsync({ leadId: lead.id, taskId: deleteTaskId });
            setDeleteTaskId(null);
          }
        }}
        onCancel={() => setDeleteTaskId(null)}
      />

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <ComposeModal
          initialTo={composeData.to}
          initialSubject={composeData.subject}
          initialHtmlBody={composeData.body}
          onClose={() => setIsComposeOpen(false)}
          onSend={handleSendEmail}
          sending={sendingEmail}
          zIndex={60}
        />
      )}
    </div>
  );
});

LeadTasksTab.displayName = "LeadTasksTab";
