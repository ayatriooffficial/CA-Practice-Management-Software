"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Calendar, User, Building, AlertCircle, Loader2 } from "lucide-react";
import { todoApi } from "@/services/todoApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ChecklistInputItem {
  id: string;
  title: string;
  isMandatory: boolean;
}

const CATEGORY_OPTIONS = [
  "General",
  "Income Tax",
  "GST",
  "Statutory Audit",
  "Internal Audit",
  "ROC & Compliance",
  "Accounting",
  "Payroll",
];

const PRIORITY_OPTIONS: Array<"Low" | "Medium" | "High" | "Urgent"> = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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
  const [startDate, setStartDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  });

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistInputItem[]>([
    { id: "1", title: "Collect initial supporting documents", isMandatory: true },
    { id: "2", title: "Prepare draft workings and computations", isMandatory: true },
    { id: "3", title: "Perform internal review check", isMandatory: false },
  ]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newChecklistMandatory, setNewChecklistMandatory] = useState(true);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            setSelectedAssigneeId(activeEmps[0].id);
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
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!taskName.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }
    if (!selectedAssigneeId) {
      setErrorMessage("Please select an employee to assign this task to.");
      return;
    }
    if (!dueDate) {
      setErrorMessage("Please select a target due date.");
      return;
    }

    const selectedEmployee = employees.find((e) => e.id === selectedAssigneeId);
    const selectedClient = clients.find((c) => c.id === selectedClientId);

    try {
      setIsSubmitting(true);
      await todoApi.assignTask({
        taskName: taskName.trim(),
        description: description.trim(),
        category,
        priority,
        clientId: selectedClient?.id,
        clientName: selectedClient?.name || selectedClient?.legalName || "General Client",
        assigneeId: selectedAssigneeId,
        assigneeName: selectedEmployee?.name || "Assigned Employee",
        startDate,
        targetDueDate: dueDate,
        checklist: checklist.map((c) => ({
          title: c.title,
          isMandatory: c.isMandatory,
        })),
      });

      // Reset and close
      setTaskName("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to assign task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-xl p-6 shadow-2xl border relative my-8"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
          color: "var(--text-main)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--border-main)" }}>
          <div>
            <h2 className="text-lg font-bold text-main">Assign Task to Employee</h2>
            <p className="text-xs text-subtle mt-0.5">
              Create a delegated task with real database persistence, checklists, and deadline tracking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-subtle hover:text-main hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-main">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Q3 Statutory Audit Documentation Review"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden focus:ring-1 focus:ring-primary bg-surface text-main"
              style={{ borderColor: "var(--border-main)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-main">
              Description / Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear instructions and deliverables for the employee..."
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden focus:ring-1 focus:ring-primary bg-surface text-main resize-none"
              style={{ borderColor: "var(--border-main)" }}
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-main">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-main">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Client & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-main">
                Client <span className="text-subtle font-normal">(Optional)</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
                disabled={isLoadingClients}
              >
                <option value="">-- No Specific Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.legalName} {c.fileNo ? `(${c.fileNo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-main">
                Assign to Employee <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
                disabled={isLoadingEmployees}
              >
                <option value="">-- Select Active Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.designation || emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-main">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-main">
                Target Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
              />
            </div>
          </div>

          {/* Checklist Builder */}
          <div className="pt-2 border-t" style={{ borderColor: "var(--border-main)" }}>
            <label className="block text-xs font-semibold mb-2 text-main">
              Checklist Steps & Deliverables ({checklist.length})
            </label>

            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border text-xs"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: "var(--border-main)",
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-subtle">{idx + 1}.</span>
                    <span className="truncate text-main font-medium">{item.title}</span>
                    {item.isMandatory && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="p-1 rounded text-subtle hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add checklist item row */}
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
                placeholder="Add checklist deliverable..."
                className="flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-surface text-main"
                style={{ borderColor: "var(--border-main)" }}
              />
              <label className="flex items-center gap-1.5 text-xs text-subtle cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newChecklistMandatory}
                  onChange={(e) => setNewChecklistMandatory(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>Mandatory</span>
              </label>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors flex items-center gap-1"
                style={{ borderColor: "var(--border-main)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t flex items-center justify-end gap-3" style={{ borderColor: "var(--border-main)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-subtle transition-colors"
              style={{ borderColor: "var(--border-main)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Assign Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
