"use client";

import React, { useState } from "react";
import { X, Check, Calendar, Clock, User, Phone, MessageSquare } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useCreateLeadTask, useUpdateLeadTask } from "@/hooks/useLeadsQuery";

interface AddLeadTaskModalProps {
  lead: Lead;
  taskToEdit?: any;
  onClose: () => void;
}

export const AddLeadTaskModal: React.FC<AddLeadTaskModalProps> = ({
  lead,
  taskToEdit,
  onClose,
}) => {
  const createMutation = useCreateLeadTask();
  const updateMutation = useUpdateLeadTask();

  const todayStr = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(taskToEdit?.title || "Follow-up consultation");
  const [taskDate, setTaskDate] = useState(taskToEdit?.taskDate || todayStr);
  const [startTime, setStartTime] = useState(taskToEdit?.startTime || "-");
  const [endTime, setEndTime] = useState(taskToEdit?.endTime || "-");
  const [priority, setPriority] = useState(taskToEdit?.priority || "High");
  const [contactMethod, setContactMethod] = useState(taskToEdit?.contactMethod || "Call");
  const [outcome, setOutcome] = useState(taskToEdit?.outcome || "RNR");
  const [assigneeName, setAssigneeName] = useState(taskToEdit?.assigneeName || "kavin raj");
  const [status, setStatus] = useState(taskToEdit?.status || "Pending");
  const [notes, setNotes] = useState(taskToEdit?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const payload = {
        title: title.trim(),
        taskDate,
        startTime,
        endTime,
        priority,
        contactMethod,
        outcome,
        assigneeName,
        assigneeInitials: assigneeName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((n: string) => n[0])
          .join("")
          .toUpperCase() || "ST",
        status,
        author: "Staff",
        notes,
        contactEmail: lead.email,
        contactPhone: lead.mobile,
      };

      if (taskToEdit) {
        await updateMutation.mutateAsync({
          leadId: lead.id,
          taskId: taskToEdit.id || taskToEdit._id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync({
          leadId: lead.id,
          data: payload,
        });
      }

      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save follow-up task");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {taskToEdit ? "Edit Follow-up Task" : "Add Follow-up Task"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow-Up on ITR 1 - 26As, pricing"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Date & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Contact Method & Outcome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Contact Method
              </label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Meeting">Meeting</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Outcome
              </label>
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g. RNR, Interested, Callback"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Start Time (Optional)
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. 10:00 AM or -"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                End Time (Optional)
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g. 10:30 AM or -"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>
          </div>

          {/* Assignee & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Assignee Name
              </label>
              <input
                type="text"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="e.g. kavin raj"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notes / Agenda
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes or outcome description..."
              className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B] resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-white font-semibold shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : taskToEdit ? "Update Task" : "Save Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
