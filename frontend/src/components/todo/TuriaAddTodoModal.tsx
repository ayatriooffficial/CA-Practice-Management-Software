"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  Repeat,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  UploadCloud,
  FileText,
} from "lucide-react";
import { todoApi } from "@/services/todoApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { getTodayKolkataYMD } from "./todoDateUtils";

interface TuriaAddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin: boolean;
  currentUserId?: string;
  currentUserName?: string;
  defaultDate?: string;
}

interface SubtaskItem {
  id: string;
  title: string;
  isMandatory: boolean;
}

const TAG_OPTIONS = [
  "General",
  "GST",
  "Income Tax",
  "Audit",
  "Compliance",
  "ROC",
  "Personal",
  "Accounting",
  "Payroll",
];

const PRIORITY_OPTIONS: Array<"Low" | "Medium" | "High" | "Urgent"> = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export const TuriaAddTodoModal: React.FC<TuriaAddTodoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isAdmin,
  currentUserId,
  currentUserName,
  defaultDate,
}) => {
  const [taskName, setTaskName] = useState("");
  const [dueDate, setDueDate] = useState(() => defaultDate || getTodayKolkataYMD());
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedTag, setSelectedTag] = useState("General");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [description, setDescription] = useState("");

  // Subtasks
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data sources
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync default date when opening
  useEffect(() => {
    if (isOpen) {
      setDueDate(defaultDate || getTodayKolkataYMD());
      setErrorMessage(null);
    }
  }, [isOpen, defaultDate]);

  // Load clients and employees from backend
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingClients(true);
    clientApi
      .getClients({ page: 1, limit: 100 })
      .then((res) => {
        if (mounted && res.data) {
          setClients(res.data);
        }
      })
      .catch((err) => console.error("Error loading clients:", err))
      .finally(() => {
        if (mounted) setIsLoadingClients(false);
      });

    setIsLoadingEmployees(true);
    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (mounted && emps) {
          const activeEmps = emps.filter(
            (e) => (e.status || "").toLowerCase() === "active"
          );
          setEmployees(activeEmps);
          if (activeEmps.length > 0 && !selectedAssigneeId) {
            // Default to current user if found, or first active employee
            const selfEmp = activeEmps.find((e) => e.id === currentUserId);
            setSelectedAssigneeId(selfEmp ? selfEmp.id : activeEmps[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading employees:", err))
      .finally(() => {
        if (mounted) setIsLoadingEmployees(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, currentUserId, selectedAssigneeId]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${prev.length + 1}`,
        title: newSubtaskText.trim(),
        isMandatory: true,
      },
    ]);
    setNewSubtaskText("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      setAttachments((prev) => [...prev, { name: file.name, size: sizeStr }]);
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const titleClean = taskName.trim();
    if (!titleClean) {
      setErrorMessage("To-Do Title is required.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("Please select a due date.");
      return;
    }

    const selectedEmployee = employees.find((e) => e.id === selectedAssigneeId);
    const selectedClient = clients.find((c) => c.id === selectedClientId);

    try {
      setIsSubmitting(true);

      if (isAdmin && selectedAssigneeId) {
        // Admin delegating / assigning task
        await todoApi.assignTask({
          taskName: titleClean,
          description: description.trim(),
          category: selectedTag,
          clientId: selectedClientId || undefined,
          clientName: selectedClient ? (selectedClient.name || selectedClient.legalName) : "General Client",
          assigneeId: selectedAssigneeId,
          assigneeName: selectedEmployee?.name || currentUserName || "Unassigned",
          priority,
          startDate: getTodayKolkataYMD(),
          targetDueDate: dueDate,
          checklist: subtasks.map((st) => ({
            title: st.title,
            isMandatory: st.isMandatory,
          })),
        });
      } else {
        // Employee or personal to-do creation
        await todoApi.createTodo(titleClean, dueDate, {
          description: description.trim(),
          priority,
          category: selectedTag,
          clientName: selectedClient ? (selectedClient.name || selectedClient.legalName) : "Personal",
          clientId: selectedClientId || undefined,
        });
      }

      // Reset fields
      setTaskName("");
      setDescription("");
      setSubtasks([]);
      setAttachments([]);
      setIsRecurring(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save to-do task:", err);
      setErrorMessage(err.message || "Failed to create to-do task. Please check the inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-card rounded-2xl shadow-2xl border border-gray-100 dark:border-border overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Soft Lavender Header matching Turia reference */}
        <div className="bg-[#EEF2FD] dark:bg-indigo-950/40 px-6 py-4 flex items-center justify-between border-b border-indigo-100/60 dark:border-indigo-900/40 shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#1E293B] dark:text-white tracking-tight">
              New To-Do
            </h2>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
              Fill in the details below
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200/60 dark:border-slate-700 shadow-2xs flex items-center justify-center cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. To-Do Title * */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              To-Do Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Call to discuss pricing"
              className="w-full h-10 px-3.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* 2. Due Date & Priority Row */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3.5 pr-9 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all"
                />
                <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-10 px-3.5 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 3. Recurrence Box Card */}
          <div className="border border-gray-200/80 dark:border-border rounded-xl p-3 flex items-center justify-between bg-white dark:bg-card">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FD] dark:bg-indigo-950/60 text-[#5551FF] flex items-center justify-center shrink-0 border border-indigo-100/80 dark:border-indigo-900/40">
                <Repeat className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-900 dark:text-white">
                  Recurrence
                </span>
                <span className="block text-[11px] text-gray-400 dark:text-gray-500">
                  Repeat this to-do automatically
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRecurring((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isRecurring ? "bg-[#5551FF]" : "bg-gray-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isRecurring ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 4. Tag & Client Selectors */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Tag
              </label>
              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full h-10 px-3.5 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="">Select Tag</option>
                  {TAG_OPTIONS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Client
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full h-10 px-3.5 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                >
                  <option value="">Select Client</option>
                  {isLoadingClients ? (
                    <option disabled>Loading clients...</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.legalName}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 5. Assignee Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Assignee
            </label>
            <div className="relative">
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full h-10 px-3.5 pr-8 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
              >
                <option value="">Assignee</option>
                {isLoadingEmployees ? (
                  <option disabled>Loading employees...</option>
                ) : (
                  employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role || "Team Member"})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 6. Description with Rich Toolbar */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <div className="rounded-lg border border-gray-200 dark:border-border overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500">
              {/* Rich formatting toolbar */}
              <div className="bg-[#F8FAFC] dark:bg-slate-800/80 px-3 py-1.5 border-b border-gray-200 dark:border-border flex items-center space-x-3 text-gray-500 dark:text-gray-400">
                <button
                  type="button"
                  title="Bold"
                  onClick={() => setDescription((prev) => `${prev} **bold**`)}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => setDescription((prev) => `${prev} *italic*`)}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Underline"
                  onClick={() => setDescription((prev) => `${prev} <u>underline</u>`)}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough"
                  onClick={() => setDescription((prev) => `${prev} ~~strikethrough~~`)}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-3.5 bg-gray-200 dark:bg-slate-700" />
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => setDescription((prev) => `${prev}\n• `)}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => setDescription((prev) => `${prev}\n1. `)}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-3.5 bg-gray-200 dark:bg-slate-700" />
                <button
                  type="button"
                  title="Undo"
                  onClick={() => setDescription((prev) => prev.slice(0, -5))}
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Redo"
                  className="hover:text-gray-800 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer opacity-60"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or details..."
                className="w-full p-3 bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* 7. Attachments with ☁ Add Attachment button */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Attachments
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#EEF2FD] dark:bg-indigo-950/60 text-[#5551FF] hover:bg-[#E0E7FF] dark:hover:bg-indigo-900/60 font-medium text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 stroke-[2.2]" />
              <span>Add Attachment</span>
            </button>

            {/* List attached files */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 rounded-md bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate text-gray-700 dark:text-gray-300">{att.name}</span>
                      <span className="text-[10px] text-gray-400">({att.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-gray-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8. Subtasks Row with + Add Button */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Subtasks
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add new subtask..."
                className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="h-9 px-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Subtasks List */}
            {subtasks.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-md bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700 text-xs"
                  >
                    <span className="truncate text-gray-700 dark:text-gray-300">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-gray-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer with Cancel and Add To-Do */}
          <div className="pt-3 border-t border-gray-100 dark:border-border/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#5551FF] hover:bg-[#4338CA] rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add To-Do</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
