'use client';

import React, { useState } from 'react';

interface ComposeModalProps {
  onClose: () => void;
  onSend: (params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sending?: boolean;
}

export function ComposeModal({ onClose, onSend, sending }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !body.trim()) {
      setError('Recipient and message body are required.');
      return;
    }
    setError(null);
    const res = await onSend({
      to: to.trim(),
      cc: cc.trim() || undefined,
      subject: subject.trim(),
      body: body.trim(),
    });
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to send email.');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 580,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-dropdown)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-main)',
            paddingBottom: '0.75rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            New Message
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--credits-bg)',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              border: '1px solid var(--credits-border)',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              required
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To"
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-main)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Cc
              </button>
            )}
          </div>

          {showCc && (
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Cc"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-main)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          )}

          <input
            required
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-main)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />

          <textarea
            required
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email here..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-main)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-main)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-main)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'var(--text-inverse)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
