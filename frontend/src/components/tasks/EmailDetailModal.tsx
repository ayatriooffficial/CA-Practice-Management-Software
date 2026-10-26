'use client';

import React from 'react';
import { X, Mail, Calendar, User, Paperclip, Loader2, ExternalLink } from 'lucide-react';
import { useGmailThread } from '@/hooks/useGmail';
import { LinkedEmail } from '@/data/taskData';
import { HtmlEmailRenderer } from '@/components/email/HtmlEmailRenderer';

interface EmailDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailMeta: LinkedEmail | null;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  isOpen,
  onClose,
  emailMeta,
}) => {
  const threadId = emailMeta?.threadId || emailMeta?.messageId || null;

  // TanStack Query: fetches live email body with staleTime: Infinity
  const { data: messages, isLoading, isError, error } = useGmailThread(threadId);

  if (!isOpen || !emailMeta) return null;

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Slide-over Container */}
      <div className="relative w-full max-w-2xl h-full bg-[var(--bg-surface)] text-[var(--text-main)] shadow-2xl border-l border-[var(--border-main)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] bg-[var(--bg-muted)] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--primary)]">
                <Mail className="w-3.5 h-3.5" /> Linked Email Thread
              </span>
              <span className="text-[11px] text-[var(--text-subtle)] font-mono">
                ID: {emailMeta.messageId.slice(0, 10)}…
              </span>
            </div>
            <h2 className="text-base font-bold text-[var(--text-main)] truncate">
              {emailMeta.subject || '(No Subject)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email details"
            className="text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
              <p className="text-xs font-medium">Fetching email body from Gmail API…</p>
              <p className="text-[11px] text-[var(--text-subtle)]">Fast cached TanStack query</p>
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 text-[var(--danger)] text-xs rounded-lg border border-red-200 dark:border-red-900">
              <p className="font-semibold mb-1">Failed to load email thread</p>
              <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
              <div className="mt-4 p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-main)] text-[var(--text-main)]">
                <p className="font-medium text-xs mb-1">Stored Snippet Fallback:</p>
                <p className="text-xs text-[var(--text-muted)]">{emailMeta.snippet || 'No snippet available.'}</p>
              </div>
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-muted)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                  <span className="font-semibold text-[var(--text-main)]">{emailMeta.sender}</span>
                  <span>{formatDate(emailMeta.date)}</span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">{emailMeta.subject}</h3>
                <p className="text-xs text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
                  {emailMeta.snippet}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xs overflow-hidden"
                >
                  {/* Message Sender Header */}
                  <div className="px-5 py-3.5 bg-[var(--bg-muted)] border-b border-[var(--border-main)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {(msg.from || 'U').slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                          {msg.from}
                        </p>
                        <p className="text-[11px] text-[var(--text-subtle)] truncate">
                          To: {msg.to || 'Me'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--text-subtle)] shrink-0 font-mono">
                      {formatDate(msg.date)}
                    </span>
                  </div>

                  {/* Message Body */}
                  <div className="p-5 text-xs text-[var(--text-main)] overflow-x-auto leading-relaxed">
                    {msg.bodyHtml ? (
                      <HtmlEmailRenderer html={msg.bodyHtml} />
                    ) : (
                      <pre className="font-sans whitespace-pre-wrap break-words text-xs text-[var(--text-main)]">
                        {msg.bodyText || '(No content)'}
                      </pre>
                    )}
                  </div>

                  {/* Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="px-5 py-3 bg-[var(--bg-muted)] border-t border-[var(--border-main)]">
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" /> Attachments ({msg.attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att, aIdx) => (
                          <div
                            key={aIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-main)]"
                          >
                            <Paperclip className="w-3 h-3 text-[var(--primary)]" />
                            <span className="font-medium truncate max-w-[150px]">{att.filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-main)] bg-[var(--bg-muted)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            Linked on {formatDate(emailMeta.linkedAt)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
