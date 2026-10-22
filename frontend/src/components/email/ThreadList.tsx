'use client';

import React from 'react';
import type { ThreadListItem } from '@/lib/integrations/gmail';

interface ThreadListProps {
  threads: ThreadListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function ThreadList({
  threads,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  onRefresh,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
}: ThreadListProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-main)',
      }}
    >
      {/* Search & Actions Bar */}
      <div
        style={{
          padding: '0.875rem',
          borderBottom: '1px solid var(--border-main)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails…"
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-main)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh emails"
          disabled={loading}
          style={{
            padding: '0.45rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-main)',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem',
          }}
        >
          ↻
        </button>
      </div>

      {/* Threads List Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {loading && threads.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div
              style={{
                width: 24,
                height: 24,
                margin: '0 auto 8px',
                border: '2px solid var(--border-main)',
                borderTopColor: 'var(--primary)',
                borderRadius: 'var(--radius-full)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Loading threads…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : threads.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.875rem' }}>No emails found</p>
            {searchQuery && (
              <p style={{ fontSize: '0.75rem', marginTop: 4 }}>
                Try searching with different terms
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {threads.map((thread) => {
              const isSelected = selectedId === thread.id;
              const formattedDate = thread.date
                ? new Date(thread.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '';

              return (
                <button
                  type="button"
                  key={thread.id}
                  onClick={() => onSelect(thread.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.875rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: isSelected
                      ? 'var(--bg-active)'
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      {thread.unread && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--primary)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: thread.unread ? 700 : 600,
                          color: 'var(--text-main)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {thread.from || 'Unknown'}
                      </span>
                    </div>

                    <time
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-subtle)',
                        flexShrink: 0,
                      }}
                    >
                      {formattedDate}
                    </time>
                  </div>

                  <p
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: thread.unread ? 600 : 500,
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}
                  >
                    {thread.subject}
                    {thread.messageCount > 1 && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)',
                          marginLeft: 6,
                          fontWeight: 400,
                        }}
                      >
                        ({thread.messageCount})
                      </span>
                    )}
                  </p>

                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {thread.snippet}
                  </p>
                </button>
              );
            })}

            {hasMore && (
              <div style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-main)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingMore ? 'Loading more…' : 'Load more emails'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
