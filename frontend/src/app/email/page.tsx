'use client';

import React, { useState } from 'react';
import { useGmail } from '@/hooks/useGmail';
import { ThreadList } from '@/components/email/ThreadList';
import { ThreadView } from '@/components/email/ThreadView';
import { ComposeModal } from '@/components/email/ComposeModal';

export default function EmailPage() {
  const {
    status,
    email,
    error,
    threads,
    loadingThreads,
    selectedThreadId,
    messages,
    loadingMessages,
    searchQuery,
    setSearchQuery,
    hasMore,
    loadingMore,
    sending,
    loadMore,
    selectThread,
    refreshThreads,
    sendEmail,
    startAuth,
    disconnect,
  } = useGmail();

  const [isComposeOpen, setIsComposeOpen] = useState(false);

  /* ── When Disconnected: Show Connection Card ──────────────────────── */
  if (status === 'disconnected' || status === 'loading') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '1.5rem',
          }}
        >
          Email Integration
        </h1>

        <section
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-main)',
            backgroundColor: 'var(--bg-surface)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}
              >
                Gmail
              </h2>
              <p
                style={{
                  marginTop: 4,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                {status === 'loading' ? 'Checking connection…' : 'Not connected'}
              </p>
            </div>

            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 'var(--radius-full)',
                backgroundColor:
                  status === 'loading'
                    ? 'var(--banner-text)'
                    : 'var(--text-subtle)',
                flexShrink: 0,
              }}
            />
          </div>

          {status === 'loading' ? (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  margin: '0 auto 12px',
                  border: '3px solid var(--border-main)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: 'var(--radius-full)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Checking Gmail connection…
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  marginBottom: 16,
                }}
              >
                Connect your Google account to send emails and sync client communications.
              </p>
              <button
                type="button"
                onClick={startAuth}
                style={{
                  padding: '10px 28px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--text-inverse)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                Connect Gmail
              </button>
            </div>
          )}

          {error && (
            <p
              style={{
                marginTop: 12,
                fontSize: '0.75rem',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--credits-bg)',
                border: '1px solid var(--credits-border)',
              }}
            >
              {error}
            </p>
          )}
        </section>
      </div>
    );
  }

  /* ── When Connected: Status Bar + Two-Pane View ───────────────────── */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - var(--header-height, 56px))',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Top Status Bar & Menu */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-main)',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}
          >
            Email Inbox
          </h1>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--badge-new-bg)',
              fontSize: '0.75rem',
              color: 'var(--badge-new-text)',
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--status-online)',
              }}
            />
            <span style={{ color: 'var(--text-main)' }}>{email}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'var(--text-inverse)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            + Compose
          </button>

          <button
            type="button"
            onClick={() => void disconnect()}
            title="Disconnect Gmail"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-main)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Main Two-Pane Inbox Layout */}
      <div
        className="email-inbox-grid"
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Left Pane: Thread List */}
        <div
          className={`email-pane-list ${selectedThreadId ? 'hidden md:block' : 'block'}`}
          style={{
            width: '100%',
            maxWidth: 380,
            height: '100%',
            flexShrink: 0,
          }}
        >
          <ThreadList
            threads={threads}
            selectedId={selectedThreadId}
            onSelect={selectThread}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={refreshThreads}
            loading={loadingThreads}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        </div>

        {/* Right Pane: Thread View */}
        <div
          className={`email-pane-view ${selectedThreadId ? 'block' : 'hidden md:block'}`}
          style={{
            flex: 1,
            height: '100%',
            minWidth: 0,
          }}
        >
          <ThreadView
            messages={messages}
            loading={loadingMessages}
            onBack={() => selectThread(null)}
            onReply={sendEmail}
            sending={sending}
          />
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <ComposeModal
          onClose={() => setIsComposeOpen(false)}
          onSend={sendEmail}
          sending={sending}
        />
      )}
    </div>
  );
}
