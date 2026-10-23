"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Client } from "@/data/crmData";
import { usePermission } from "../../team/usePermission";

interface ClientNotesTabProps {
  client: Client;
  setIsAddNoteOpen: (isOpen: boolean) => void;
  handleDeleteNote: (noteId: string) => void;
}

export const ClientNotesTab: React.FC<ClientNotesTabProps> = ({
  client,
  setIsAddNoteOpen,
  handleDeleteNote,
}) => {
  const { canDelete } = usePermission();
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Client Notes & Observations
        </h2>
        <button
          type="button"
          onClick={() => setIsAddNoteOpen(true)}
          className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{ backgroundColor: "var(--premium-blue-dark)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Note</span>
        </button>
      </div>

      <div className="p-6 space-y-4">
        {!client.notes || client.notes.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-medium text-xs">
            No internal notes recorded. Click "+ Add Note" to create one.
          </div>
        ) : (
          client.notes.map((note) => (
            <div
              key={note.id}
              className="p-4 rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/30 flex items-start justify-between gap-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {note.title}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {note.createdAt
                      ? new Date(note.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {note.content}
                </p>
                <span className="text-[10px] text-gray-400 font-medium block">
                  Logged by {note.author || "Dipak Sahani"}
                </span>
              </div>
              {canDelete("clients") && (
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id || "")}
                  title="Delete Note"
                  className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
