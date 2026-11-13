"use client";

import React from "react";
import { X, Paperclip } from "lucide-react";

interface AddSubTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  subTaskName: string;
  setSubTaskName: (v: string) => void;
  subTaskBudgetTime: string;
  setSubTaskBudgetTime: (v: string) => void;
  subTaskDescription: string;
  setSubTaskDescription: (v: string) => void;
  showToast: (msg: string) => void;
}

export const AddSubTaskModal: React.FC<AddSubTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subTaskName,
  setSubTaskName,
  subTaskBudgetTime,
  setSubTaskBudgetTime,
  subTaskDescription,
  setSubTaskDescription,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[var(--bg-surface)] text-[var(--text-main)] shadow-2xl overflow-hidden rounded-xl border border-[var(--border-main)] my-auto">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)]">
          <h3 className="text-base font-bold text-[var(--text-main)]">Sub Task</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Sub Task Name <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sub Task Name"
                  value={subTaskName}
                  onChange={(e) => setSubTaskName(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Budget Time(00:00 Hrs)
                </label>
                <input
                  type="text"
                  placeholder="00:00 Hrs"
                  value={subTaskBudgetTime}
                  onChange={(e) => setSubTaskBudgetTime(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Description"
                value={subTaskDescription}
                onChange={(e) => setSubTaskDescription(e.target.value)}
                className="w-full p-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => showToast("Attachment selector opened")}
                className="px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--brand-soft)] text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors flex items-center gap-x-1.5 cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>+ Add Attachments</span>
              </button>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-x-2 px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ backgroundColor: "var(--primary)" }}
              className="h-9 px-5 text-xs font-semibold text-white rounded-lg hover:opacity-95 cursor-pointer shadow-xs"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
