'use client';

import React, { useState } from 'react';
import type { ParsedMessage } from '@/lib/integrations/gmail';

interface ThreadViewProps {
  messages: ParsedMessage[];
  loading: boolean;
  onBack?: () => void;
  onReply: (params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    threadId: string;
    inReplyTo: string;
    references: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sending?: boolean;
}

export function ThreadView({
  messages,
  loading,
  onBack,
  onReply,
  sending,
}: ThreadViewProps) {
  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            marginBottom: 12,
            border: '3px solid var(--border-main)',
            borderTopColor: 'var(--primary)',
            borderRadius: 'var(--radius-full)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.875rem' }}>Loading thread messages…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          color: 'var(--text-muted)',
        }}
      >
        <p style={{ fontSize: '0.875rem' }}>Select an email thread from the list to read it.</p>
      </div>
    );
  }

  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setReplyError(null);

    /* Compute reply headers */
    const to = lastMessage.from || firstMessage.from;
    const subject = firstMessage.subject.startsWith('Re:')
      ? firstMessage.subject
      : `Re: ${firstMessage.subject}`;
    const inReplyTo = lastMessage.messageIdHeader || '';
    const existingRefs = lastMessage.references || '';
    const references = [existingRefs, inReplyTo].filter(Boolean).join(' ');

    const res = await onReply({
      to,
      subject,
      body: replyBody.trim(),
      threadId: firstMessage.threadId,
      inReplyTo,
      references,
    });

    if (res.success) {
      setReplyBody('');
    } else {
      setReplyError(res.error || 'Failed to send reply.');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        overflowY: 'auto',
      }}
    >
      {/* Thread Header Bar */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-main)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-main)',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}

          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {firstMessage.subject}
            </h1>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: 2,
              }}
            >
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Stream in Chronological Order */}
      <div
        style={{
          flex: 1,
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.map((message) => {
          return (
            <article
              key={message.id}
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-main)',
                backgroundColor: 'var(--bg-surface)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Message Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <strong
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-main)',
                      display: 'block',
                    }}
                  >
                    {message.from}
                  </strong>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: 2,
                    }}
                  >
                    To: {message.to}
                  </p>
                </div>

                <time
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-subtle)',
                    flexShrink: 0,
                  }}
                >
                  {message.date}
                </time>
              </div>

              {/* Message Body (HTML or Plain Text) */}
              <div
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: 'var(--text-main)',
                  overflowWrap: 'break-word',
                }}
              >
                {message.bodyHtml ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                    style={{
                      maxHeight: 600,
                      overflowY: 'auto',
                    }}
                  />
                ) : (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{message.bodyText}</p>
                )}
              </div>

              {/* Attachments Section */}
              {message.attachments && message.attachments.length > 0 && (
                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px dashed var(--border-main)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Attachments ({message.attachments.length})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {message.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-main)',
                          fontSize: '0.75rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        <span>📎</span>
                        <span style={{ fontWeight: 500 }}>{att.filename}</span>
                        {att.size && (
                          <span style={{ color: 'var(--text-subtle)' }}>
                            ({Math.round(att.size / 1024)} KB)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {/* Reply Section */}
        <section
          style={{
            marginTop: '0.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-main)',
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h2
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '0.75rem',
            }}
          >
            Reply to {lastMessage.from}
          </h2>

          {replyError && (
            <div
              style={{
                marginBottom: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--credits-bg)',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                border: '1px solid var(--credits-border)',
              }}
            >
              {replyError}
            </div>
          )}

          <form onSubmit={handleSendReply}>
            <textarea
              required
              rows={4}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-main)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '0.75rem',
              }}
            >
              <button
                type="submit"
                disabled={sending || !replyBody.trim()}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--text-inverse)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: sending || !replyBody.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !replyBody.trim() ? 0.6 : 1,
                }}
              >
                {sending ? 'Sending reply…' : 'Send Reply'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
