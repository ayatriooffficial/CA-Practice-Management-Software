'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, Mail, Loader2, Check, ExternalLink } from 'lucide-react';
import { useGmailThreads } from '@/hooks/useGmail';
import { useLinkEmailToTask } from '@/hooks/useTaskMutations';
import { LinkedEmail, TaskItem } from '@/data/taskData';
import { ThreadListItem } from '@/lib/integrations/gmail';

interface LinkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem;
  onSuccess?: (updatedTask: TaskItem) => void;
}

export const LinkEmailModal: React.FC<LinkEmailModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThread, setSelectedThread] = useState<ThreadListItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // TanStack Query for inbox threads (cached with staleTime: 60000)
  const { data, isLoading, isError, error } = useGmailThreads();
  const linkMutation = useLinkEmailToTask();

  const threads = data?.threads || [];

  // Filter threads by search term
  const filteredThreads = useMemo(() => {
    if (!searchTerm.trim()) return threads;
    const term = searchTerm.toLowerCase();
    return threads.filter(
      (t) =>
        t.subject?.toLowerCase().includes(term) ||
        t.from?.toLowerCase().includes(term) ||
        t.snippet?.toLowerCase().includes(term),
    );
  }, [threads, searchTerm]);

  // Check if thread is already linked to this task
  const isThreadAlreadyLinked = (threadId: string) => {
    return Boolean(task.linkedEmails?.some((e) => e.threadId === threadId));
  };

  const handleLink = async (thread: ThreadListItem) => {
    setErrorMsg(null);
    const targetTaskId = task.id || (task as any)._id || task.taskId;
    const emailMeta: LinkedEmail = {
      messageId: thread.id, // using thread root message ID
      threadId: thread.id,
      subject: thread.subject || '(No Subject)',
      snippet: thread.snippet || '',
      sender: thread.from || 'Unknown Sender',
      date: thread.date || new Date().toISOString(),
      linkedAt: new Date().toISOString(),
    };

    try {
      const updated = await linkMutation.mutateAsync({
        taskId: targetTaskId,
        email: emailMeta,
      });
      if (updated && onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to link email');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-2xl border border-[var(--border-main)] overflow-hidden my-6 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)] bg-[var(--bg-muted)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--primary)] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-main)]">
                Link Email to Task
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Select an email from your Gmail inbox to connect with <span className="font-semibold text-[var(--text-main)]">{task.taskId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[var(--border-main)] bg-[var(--bg-surface)]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              type="text"
              placeholder="Search emails by sender, subject, or keywords…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[var(--border-main)] bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        {/* Error message */}
        {(errorMsg || isError) && (
          <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-950/40 text-[var(--danger)] text-xs rounded-lg border border-red-200 dark:border-red-900">
            {errorMsg || (error instanceof Error ? error.message : 'Error loading emails')}
          </div>
        )}

        {/* Email Threads List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-[var(--border-main)]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[var(--text-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)] mb-2" />
              <p className="text-xs">Loading inbox emails…</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No emails found</p>
              <p className="text-[11px] text-[var(--text-subtle)] mt-1">
                {searchTerm ? 'Try adjusting your search filter' : 'No threads available in your inbox'}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const alreadyLinked = isThreadAlreadyLinked(thread.id);
              const isSelected = selectedThread?.id === thread.id;

              return (
                <div
                  key={thread.id}
                  onClick={() => !alreadyLinked && setSelectedThread(thread)}
                  className={`pt-2.5 pb-2.5 px-3 rounded-lg flex items-start justify-between gap-3 transition-colors ${
                    alreadyLinked
                      ? 'opacity-50 cursor-not-allowed bg-[var(--bg-muted)]'
                      : isSelected
                      ? 'bg-[var(--brand-soft)] border border-[var(--primary)] cursor-pointer'
                      : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-main)] truncate max-w-[200px]">
                        {thread.from || 'Unknown'}
                      </span>
                      {alreadyLinked && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                          <Check className="w-3 h-3" /> Already Linked
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-subtle)] ml-auto shrink-0 font-mono">
                        {thread.date}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[var(--text-main)] truncate mt-0.5">
                      {thread.subject || '(No Subject)'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                      {thread.snippet}
                    </p>
                  </div>

                  {!alreadyLinked && (
                    <button
                      type="button"
                      disabled={linkMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleLink(thread);
                      }}
                      className="shrink-0 mt-1 px-3 py-1 text-xs font-medium rounded-md bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                    >
                      {linkMutation.isPending && selectedThread?.id === thread.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Linking…</span>
                        </>
                      ) : (
                        <span>Link</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-main)] bg-[var(--bg-muted)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {filteredThreads.length} emails available
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
