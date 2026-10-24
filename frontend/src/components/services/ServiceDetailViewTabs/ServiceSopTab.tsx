"use client";

import React, { useState } from "react";
import { Service, ServiceSop } from "@/data/serviceData";
import { serviceApi } from "@/services/serviceApi";
import {
  FileDown,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  Paperclip,
  Smile,
  Send,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";

interface ServiceSopTabProps {
  service: Service;
  sopContent: string;
  setSopContent: (val: string) => void;
  handleSaveSop: (structured?: ServiceSop) => Promise<void>;
  isSavingSop: boolean;
}

interface SopParsedStructure {
  purpose: string;
  applicability: string;
  steps: string[];
}

export const ServiceSopTab: React.FC<ServiceSopTabProps> = ({
  service,
  sopContent,
  setSopContent,
  handleSaveSop,
  isSavingSop,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Parse structured sections from service.sopDetails or sopContent
  const parseSopContent = (content: string): SopParsedStructure => {
    if (
      service.sopDetails &&
      (service.sopDetails.purpose ||
        service.sopDetails.applicability ||
        (service.sopDetails.steps && service.sopDetails.steps.length > 0))
    ) {
      return {
        purpose:
          service.sopDetails.purpose ||
          "Standard operating procedure for service execution, quality compliance, and client delivery.",
        applicability:
          service.sopDetails.applicability ||
          "All active clients with recurring or on-demand engagements under this category.",
        steps:
          service.sopDetails.steps && service.sopDetails.steps.length > 0
            ? service.sopDetails.steps
            : ["First step...", "Second step..."],
      };
    }

    try {
      if (content.startsWith("{") && content.endsWith("}")) {
        const parsed = JSON.parse(content);
        if (parsed.purpose || parsed.applicability || parsed.steps) {
          return {
            purpose: parsed.purpose || "Describe what this SOP covers and why it exists.",
            applicability: parsed.applicability || "Which clients / cases this procedure applies to.",
            steps: parsed.steps && parsed.steps.length > 0 ? parsed.steps : ["First step...", "Second step..."],
          };
        }
      }
    } catch {
      // ignore
    }

    // Default structure from Screenshot 1
    return {
      purpose: content.includes("Purpose")
        ? content.split("Purpose")[1]?.split("Applicability")[0]?.replace(/^[:\s\n-]+/, "").trim() || "Describe what this SOP covers and why it exists."
        : content || "Describe what this SOP covers and why it exists.",
      applicability: content.includes("Applicability")
        ? content.split("Applicability")[1]?.split("Process Steps")[0]?.replace(/^[:\s\n-]+/, "").trim() || "Which clients / cases this procedure applies to."
        : "Which clients / cases this procedure applies to.",
      steps: content.includes("Process Steps")
        ? content
            .split("Process Steps")[1]
            ?.split("\n")
            .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
            .filter(Boolean) || ["First step...", "Second step..."]
        : ["First step...", "Second step..."],
    };
  };

  const [structure, setStructure] = useState<SopParsedStructure>(() => parseSopContent(sopContent));
  const [editingPurpose, setEditingPurpose] = useState(structure.purpose);
  const [editingApplicability, setEditingApplicability] = useState(structure.applicability);
  const [editingSteps, setEditingSteps] = useState<string[]>(structure.steps);

  // Comments state initialized from service.comments if available
  const [comments, setComments] = useState<Array<{ id: string; author: string; initials: string; text: string; time: string }>>(() => {
    if (service.comments && service.comments.length > 0) {
      return service.comments.map((c) => ({
        id: c.id,
        author: c.author,
        initials: c.authorInitials || c.author.slice(0, 2).toUpperCase(),
        text: c.text,
        time: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recently",
      }));
    }
    return [
      {
        id: "c1",
        author: "Rahul Sharma",
        initials: "RS",
        text: "Updated the filing process steps as per latest GST portal v3.4 updates.",
        time: "2 hours ago",
      },
    ];
  });
  const [newComment, setNewComment] = useState("");

  const handleStartEdit = () => {
    setEditingPurpose(structure.purpose);
    setEditingApplicability(structure.applicability);
    setEditingSteps([...structure.steps]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveStructured = async () => {
    const updated: SopParsedStructure = {
      purpose: editingPurpose.trim() || "Describe what this SOP covers and why it exists.",
      applicability: editingApplicability.trim() || "Which clients / cases this procedure applies to.",
      steps: editingSteps.filter((s) => s.trim().length > 0),
    };
    if (updated.steps.length === 0) {
      updated.steps = ["First step...", "Second step..."];
    }

    setStructure(updated);
    setSopContent(JSON.stringify(updated));
    await handleSaveSop(updated);
    setIsEditing(false);
  };

  const handleAddStep = () => {
    setEditingSteps([...editingSteps, ""]);
  };

  const handleStepChange = (index: number, val: string) => {
    const updated = [...editingSteps];
    updated[index] = val;
    setEditingSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    setEditingSteps(editingSteps.filter((_, idx) => idx !== index));
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    const trimmed = newComment.trim();
    const tempId = `comm_${Date.now()}`;
    const added = {
      id: tempId,
      author: "Admin User",
      initials: "AU",
      text: trimmed,
      time: "Just now",
    };
    setComments((prev) => [...prev, added]);
    setNewComment("");

    try {
      setIsSubmittingComment(true);
      if (service.id) {
        await serviceApi.addComment(service.id, {
          text: trimmed,
          author: "Admin User",
          authorInitials: "AU",
        });
      }
    } catch (err) {
      console.warn("Failed to persist comment to backend:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Export PDF / Print SOP
  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const stepsHtml = structure.steps
      .map((st, i) => `<li style="margin-bottom: 8px;">${st}</li>`)
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${service.name} - Standard Operating Procedure</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; line-height: 1.6; margin: 0; padding: 20px; }
            h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
            hr { border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }
            h2 { font-size: 14px; font-weight: 700; color: #111827; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
            p { font-size: 13px; color: #374151; margin: 0 0 16px 0; }
            ol { font-size: 13px; color: #374151; padding-left: 20px; }
          </style>
        </head>
        <body>
          <h1>${service.name}</h1>
          <div class="meta">
            Category: <strong>${service.category || "Retainer"}</strong> &nbsp;|&nbsp;
            Frequency: <strong>${service.frequency || "Monthly"}</strong> &nbsp;|&nbsp;
            Last updated: <strong>Jul 2026</strong>
          </div>
          <hr />
          <h2>Purpose</h2>
          <p>${structure.purpose}</p>
          <h2>Applicability</h2>
          <p>${structure.applicability}</p>
          <h2>Process Steps</h2>
          <ol>
            ${stepsHtml}
          </ol>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Standard Operating Procedure Card matching Screenshot 1 */}
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Standard Operating Procedure
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportPdf}
              className="h-8 px-3.5 text-xs font-semibold rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
              <span>Export PDF</span>
            </button>

            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit SOP</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStructured}
                  disabled={isSavingSop}
                  className="h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Body matching Screenshot 1 */}
        <div className="p-8">
          {!isEditing ? (
            <div className="space-y-6">
              {/* Service Title & Metadata */}
              <div>
                <h2 className="text-xl font-black text-[var(--text-main)]">
                  {service.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>
                    Category: <strong className="text-[var(--text-main)]">{service.category || "Retainer"}</strong>
                  </span>
                  <span>
                    Frequency: <strong className="text-[var(--text-main)]">{service.frequency || "Monthly"}</strong>
                  </span>
                  <span>
                    Last updated: <strong className="text-[var(--text-main)]">Jul 2026</strong>
                  </span>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-800" />

              {/* Section 1: Purpose */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  Purpose
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
                  {structure.purpose}
                </p>
              </div>

              {/* Section 2: Applicability */}
              <div className="space-y-2 pt-2">
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  Applicability
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-4xl">
                  {structure.applicability}
                </p>
              </div>

              {/* Section 3: Process Steps */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  Process Steps
                </h4>
                <ol className="space-y-2.5 text-xs text-gray-700 dark:text-gray-200">
                  {structure.steps.map((st, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-semibold text-gray-400 select-none">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{st}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            /* Editing Mode */
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-1.5 uppercase tracking-wider">
                  Purpose
                </label>
                <textarea
                  rows={3}
                  value={editingPurpose}
                  onChange={(e) => setEditingPurpose(e.target.value)}
                  placeholder="Describe what this SOP covers and why it exists."
                  className="w-full p-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-600 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-1.5 uppercase tracking-wider">
                  Applicability
                </label>
                <textarea
                  rows={3}
                  value={editingApplicability}
                  onChange={(e) => setEditingApplicability(e.target.value)}
                  placeholder="Which clients / cases this procedure applies to."
                  className="w-full p-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-600 leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                    Process Steps
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editingSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5 text-right">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}...`}
                        className="flex-1 h-9 px-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                      {editingSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Comments Section matching Screenshot 1 */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-bold text-[var(--text-main)]">
          Comments
        </h4>

        {/* Comment Box Card */}
        <form
          onSubmit={handleAddComment}
          className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 shadow-xs space-y-3"
        >
          <textarea
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add Comment"
            className="w-full text-xs bg-transparent border-0 resize-none text-[var(--text-main)] placeholder-gray-400 focus:outline-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            {/* Left toolbar icons: Paperclip, Smile */}
            <div className="flex items-center gap-2 text-gray-400">
              <button
                type="button"
                title="Attach file"
                className="p-1.5 rounded-md hover:text-[var(--text-main)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Insert emoji"
                className="p-1.5 rounded-md hover:text-[var(--text-main)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Send button */}
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Existing Comments List */}
        {comments.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {comments.map((comm) => (
              <div
                key={comm.id}
                className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-start gap-3 shadow-xs"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                  {comm.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-main)]">
                      {comm.author}
                    </span>
                    <span className="text-[11px] text-gray-400">{comm.time}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {comm.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
