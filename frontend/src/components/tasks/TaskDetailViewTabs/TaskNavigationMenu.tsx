"use client";

import React from "react";
import {
  Layers,
  Clock,
  DollarSign,
  Receipt,
  Mail,
  MessageSquare,
  CheckSquare,
  FolderOpen,
  FileCheck,
} from "lucide-react";
import { TaskItem } from "@/data/taskData";

interface TaskNavigationMenuProps {
  task: TaskItem;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  checklistCompleted: number;
  docsReceived: number;
}

export const TaskNavigationMenu: React.FC<TaskNavigationMenuProps> = ({
  task,
  activeSubTab,
  setActiveSubTab,
  checklistCompleted,
  docsReceived,
}) => {
  return (
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
      >
        <div className="flex items-center space-x-2">
          <FileCheck className="w-4 h-4" />
          <span>Audit Trail</span>
        </div>
      </button>
    </nav>
  );
};
