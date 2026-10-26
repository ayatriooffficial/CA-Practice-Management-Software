"use client";

import React, { memo, useState } from "react";
import { Send, FileText, Trash2, Calendar, User, Clock } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useAddLeadNote, useDeleteLeadNote } from "@/hooks/useLeadsQuery";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

interface DetailNotesTabProps {
  lead: Lead;
}

export const DetailNotesTab = memo(({ lead }: DetailNotesTabProps) => {
  const [noteText, setNoteText] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const addNoteMutation = useAddLeadNote();
  const deleteNoteMutation = useDeleteLeadNote();

  const notes = lead.detailNotes || [];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        leadId: lead.id,
        note: noteText.trim(),
        author: "Admin / Staff",
      });
      setNoteText("");
    } catch (err: any) {
      alert(err.message || "Failed to add note");
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setDeleteNoteId(noteId);
  };

  return (
    <div className="w-full space-y-4">
      {/* Tab Header */}
      <div className="pb-1 border-b border-[#e2e8f0] dark:border-[#334155]">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Detail Notes ({notes.length})
        </h2>
      </div>

      {/* Add Note Form */}
      <form
        onSubmit={handleAddNote}
        className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-3.5 shadow-sm space-y-3"
      >
        <textarea
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={`Write an internal note or meeting summary regarding ${lead.fullName}...`}
          className="w-full p-2.5 text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] resize-none"
        />

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">
            Notes are visible to all firm team members.
          </span>
          <button
            type="submit"
            disabled={!noteText.trim() || addNoteMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{addNoteMutation.isPending ? "Posting..." : "Post Note"}</span>
          </button>
        </div>
      </form>

      {/* Notes Timeline List */}
      {notes.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-2">
          <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            No notes logged yet
          </h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Post consultation summaries, follow-up takeaways, or specific compliance requirements above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-4 transition-all shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{item.author || "Staff"}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteNote(item.id)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {item.note}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={Boolean(deleteNoteId)}
        title="Delete Note?"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={async () => {
          if (deleteNoteId) {
            await deleteNoteMutation.mutateAsync({
              leadId: lead.id,
              noteId: deleteNoteId,
            });
            setDeleteNoteId(null);
          }
        }}
        onCancel={() => setDeleteNoteId(null)}
      />
    </div>
  );
});

DetailNotesTab.displayName = "DetailNotesTab";
