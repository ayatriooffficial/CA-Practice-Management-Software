"use client";

import React from "react";
import { MessageSquare, Paperclip, Smile, Send } from "lucide-react";
import { TaskComment } from "@/data/taskData";

interface TaskCommentsTabProps {
  comments: TaskComment[];
  commentText: string;
  setCommentText: (val: string) => void;
  isSendingComment: boolean;
  handleSendComment: (e: React.FormEvent) => Promise<void>;
}

export const TaskCommentsTab: React.FC<TaskCommentsTabProps> = ({
  comments,
  commentText,
  setCommentText,
  isSendingComment,
  handleSendComment,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
        <h3 className="text-xs font-bold text-[var(--text-main)]">
          Add Comment
        </h3>
        <span className="text-[11px] text-[var(--text-subtle)]">
          Task Discussion & Notes
        </span>
      </div>

      {/* Comment Box */}
      <form onSubmit={handleSendComment} className="relative">
        <textarea
          rows={3}
          placeholder="Type a comment or instruction..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="w-full p-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              aria-label="Add attachment"
              className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Add emoji"
              className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={isSendingComment || !commentText.trim()}
            style={{ backgroundColor: "var(--primary)" }}
            className="px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 rounded-md transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center space-x-1 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>

      {/* Conversation Thread */}
      <div className="space-y-3 pt-3">
        {comments.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-placeholder)]">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              No comments yet
            </p>
            <p className="text-[11px]">
              Be the first to start the conversation
            </p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span
                    style={{
                      backgroundColor: "var(--brand-soft)",
                      color: "var(--primary)",
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  >
                    {c.authorInitials || "DS"}
                  </span>
                  <span className="font-semibold text-[var(--text-main)]">
                    {c.author}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-subtle)]">
                  {new Date(c.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-[var(--text-muted)] pl-7">
                {c.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
