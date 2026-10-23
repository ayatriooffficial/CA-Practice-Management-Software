'use client';

import React, { useState } from 'react';
import { Mail, Plus, Trash2, ExternalLink, Calendar, Loader2, Link2Off } from 'lucide-react';
import { TaskItem, LinkedEmail } from '@/data/taskData';
import { useUnlinkEmailFromTask } from '@/hooks/useTaskMutations';
import { LinkEmailModal } from '../LinkEmailModal';
import { EmailDetailModal } from '../EmailDetailModal';

interface TaskLinkedEmailsTabProps {
  task: TaskItem;
  onTaskUpdated?: (updatedTask: TaskItem) => void;
}

export const TaskLinkedEmailsTab: React.FC<TaskLinkedEmailsTabProps> = ({
  task,
  onTaskUpdated,
}) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<LinkedEmail | null>(null);
  const [unlinkingMessageId, setUnlinkingMessageId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const unlinkMutation = useUnlinkEmailFromTask();
  const linkedEmails = task.linkedEmails || [];

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleUnlink = async (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    setActionError(null);
    setUnlinkingMessageId(messageId);
    const targetTaskId = task.id || (task as any)._id || task.taskId;

    try {
      const updated = await unlinkMutation.mutateAsync({
        taskId: targetTaskId,
        messageId,
      });
      if (updated && onTaskUpdated) {
        onTaskUpdated(updated);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to unlink email');
    } finally {
      setUnlinkingMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--text-main)]">Linked Emails</h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--primary)] font-mono">
              {linkedEmails.length}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Client email communication connected directly to this task
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLinkModalOpen(true)}
          id="link-email-btn"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Link Email</span>
        </button>
      </div>

      {/* Error notification if any */}
      {actionError && (
        <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-[var(--danger)] text-xs rounded-lg border border-red-200 dark:border-red-900">
          {actionError}
        </div>
      )}

      {/* Linked Emails Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {linkedEmails.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[var(--border-main)] rounded-xl bg-[var(--bg-muted)]/50">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] mb-3 shadow-xs">
              <Mail className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <h4 className="text-xs font-bold text-[var(--text-main)]">No Emails Linked</h4>
            <p className="text-[11px] text-[var(--text-muted)] max-w-sm mt-1 mb-4 leading-relaxed">
              Connect incoming client emails or correspondence directly to this compliance task for complete traceability.
            </p>
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link an Email</span>
            </button>
          </div>
        ) : (
          linkedEmails.map((email) => {
            const isUnlinking = unlinkingMessageId === email.messageId;

            return (
              <div
                key={email.messageId}
                onClick={() => setSelectedEmail(email)}
                className="group relative p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--primary)] hover:shadow-xs transition-all cursor-pointer"
              >
                {/* Top: Sender & Date & Unlink Button */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[var(--brand-soft)] text-[var(--primary)] text-xs font-bold flex items-center justify-center shrink-0 uppercase">
                      {(email.sender || 'E').slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                        {email.sender}
                      </p>
                      <p className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {formatDate(email.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Unlink Email"
                      disabled={isUnlinking}
                      onClick={(e) => void handleUnlink(e, email.messageId)}
                      className="p-1 rounded-md text-[var(--text-subtle)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                    >
                      {isUnlinking ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Subject */}
                <h4 className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                  {email.subject || '(No Subject)'}
                </h4>

                {/* Snippet */}
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-1 leading-relaxed">
                  {email.snippet || 'No preview available.'}
                </p>

                {/* Footer badge */}
                <div className="mt-2.5 pt-2 border-t border-[var(--border-main)] flex items-center justify-between text-[10px] text-[var(--text-subtle)]">
                  <span>Linked {formatDate(email.linkedAt)}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--primary)] group-hover:underline">
                    View Live Email <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Link Email Modal */}
      {isLinkModalOpen && (
        <LinkEmailModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          task={task}
          onSuccess={(updatedTask) => {
            if (onTaskUpdated) onTaskUpdated(updatedTask);
          }}
        />
      )}

      {/* Live Email Body Drawer/Modal */}
      {selectedEmail && (
        <EmailDetailModal
          isOpen={Boolean(selectedEmail)}
          onClose={() => setSelectedEmail(null)}
          emailMeta={selectedEmail}
        />
      )}
    </div>
  );
};
