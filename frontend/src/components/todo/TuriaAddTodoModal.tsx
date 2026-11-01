"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Building,
  AlertCircle,
  Loader2,
  CheckSquare,
  Clock,
  Star,
  Repeat,
} from "lucide-react";
import { todoApi } from "@/services/todoApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { getTodayKolkataYMD, getTomorrowKolkataYMD } from "./todoDateUtils";

interface TuriaAddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin: boolean;
  currentUserId?: string;
  currentUserName?: string;
  defaultDate?: string;
}

interface ChecklistInputItem {
  id: string;
  title: string;
  isMandatory: boolean;
}

const CATEGORY_OPTIONS = [
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
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");

  // Client Selection
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Assignee Selection
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Dates
  const [startDate, setStartDate] = useState(() => getTodayKolkataYMD());
  const [dueDate, setDueDate] = useState(() => defaultDate || getTodayKolkataYMD());

  // Additional options
  const [isImportant, setIsImportant] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistInputItem[]>([
    { id: "1", title: "Collect initial supporting documents", isMandatory: true },
    { id: "2", title: "Review & draft required computations", isMandatory: true },
  ]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newChecklistMandatory, setNewChecklistMandatory] = useState(true);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default due date when modal opens
  useEffect(() => {
    if (isOpen) {
      setDueDate(defaultDate || getTodayKolkataYMD());
      setStartDate(getTodayKolkataYMD());
      setErrorMessage(null);
    }
  }, [isOpen, defaultDate]);

  // Load clients & employees
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingClients(true);
    clientApi
      .getClients({ page: 1, limit: 100 })
      .then((res) => {
        if (mounted && res.data) {
          setClients(res.data);
          if (res.data.length > 0 && !selectedClientId) {
            setSelectedClientId(res.data[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading clients for to-do:", err))
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
      .catch((err) => console.error("Error loading employees for to-do:", err))
      .finally(() => {
        if (mounted) setIsLoadingEmployees(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `chk_${Date.now()}`,
        title: newChecklistText.trim(),
        isMandatory: newChecklistMandatory,
      },
    ]);
    setNewChecklistText("");
    setNewChecklistMandatory(true);
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleQuickDateSelect = (type: "today" | "tomorrow" | "next_week") => {
    if (type === "today") {
      setDueDate(getTodayKolkataYMD());
    } else if (type === "tomorrow") {
      setDueDate(getTomorrowKolkataYMD());
    } else if (type === "next_week") {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d)
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!taskName.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (isAdmin && !selectedAssigneeId) {
      setErrorMessage("Please select an employee assignment.");
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
        // Admin delegating / assigning task to an employee or self
        await todoApi.assignTask({
          taskName: taskName.trim(),
          description: description.trim(),
          category,
          clientId: selectedClientId || undefined,
          clientName: selectedClient ? (selectedClient.name || selectedClient.legalName) : "General Client",
          assigneeId: selectedAssigneeId,
          assigneeName: selectedEmployee?.name || currentUserName || "Unassigned",
          priority: isImportant && priority !== "Urgent" ? "High" : priority,
          startDate,
          targetDueDate: dueDate,
          checklist: checklist.map((c) => ({
            title: c.title,
            isMandatory: c.isMandatory,
          })),
        });
      } else {
        // Employee creating a task or personal to-do
        await todoApi.createTodo(taskName.trim(), dueDate, {
          description: description.trim(),
          priority: isImportant && priority !== "Urgent" ? "High" : priority,
          category,
          clientName: selectedClient ? (selectedClient.name || selectedClient.legalName) : "Personal",
          clientId: selectedClientId || undefined,
        });
      }

      // Reset form
      setTaskName("");
      setDescription("");
      setChecklist([]);
      setIsImportant(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-card rounded-2xl shadow-2xl border border-gray-200 dark:border-border overflow-hidden flex flex-col max-h-[92vh] transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-border/60 bg-gray-50/50 dark:bg-background/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                {isAdmin ? "Create & Assign To-Do Task" : "Create New To-Do Task"}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isAdmin
                  ? "Assign deliverable to an employee with due date, client, and checklist."
                  : "Add a task to your daily agenda with due date and priority."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. File Monthly GSTR-3B Return for March 2026"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key deliverables, client instructions, or compliance notes..."
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Client & Assignee Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Client / Company
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={isLoadingClients}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">General / Internal Practice</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.legalName} {c.fileNo ? `(${c.fileNo})` : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Assignee Select (Admin assigns to employee; employee sees self) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Assignee {isAdmin && <span className="text-red-500">*</span>}
              </label>
              {isAdmin ? (
                <div className="relative">
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    disabled={isLoadingEmployees}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role} • {emp.department || "Audit & Tax"})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                    ▼
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{currentUserName || "Assigned to You"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Category / Department
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRIORITY_OPTIONS.map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? p === "Urgent"
                            ? "bg-rose-600 text-white shadow-xs"
                            : p === "High"
                            ? "bg-amber-600 text-white shadow-xs"
                            : p === "Medium"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-gray-600 text-white shadow-xs"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Due Date & Shortcuts (Critical for Date-Wise View!) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Target Due Date <span className="text-red-500">*</span>
              </label>
              {/* Quick Date Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect("today")}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                    dueDate === getTodayKolkataYMD()
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect("tomorrow")}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                    dueDate === getTomorrowKolkataYMD()
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect("next_week")}
                  className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Next Week
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Checklist Steps ({checklist.length})
              </label>
              <span className="text-[11px] text-gray-400">
                Steps will automatically track completion progress %
              </span>
            </div>

            {/* Checklist List */}
            <div className="space-y-1.5 mb-2">
              {checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-border/60 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 truncate">
                      {item.title}
                    </span>
                    {item.isMandatory && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/30">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Checklist Step Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Add sub-task step and press Enter..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>
          </div>

          {/* Quick Flags (Important & Recurring) */}
          <div className="flex items-center gap-6 pt-2 border-t border-gray-100 dark:border-border/60">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Star className={`w-3.5 h-3.5 ${isImportant ? "fill-amber-400 text-amber-500" : "text-gray-400"}`} />
                <span>Mark as Important</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Repeat className={`w-3.5 h-3.5 ${isRecurring ? "text-indigo-500" : "text-gray-400"}`} />
                <span>Recurring Master SOP</span>
              </span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-100 dark:border-border/60 bg-gray-50/50 dark:bg-background/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#5B50E5] hover:bg-[#4E43D8] rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAdmin ? "Assign Task" : "Create Task"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
