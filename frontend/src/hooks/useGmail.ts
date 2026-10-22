'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as gmail from '@/lib/integrations/gmail';
import type { ParsedMessage, ThreadListItem } from '@/lib/integrations/gmail';

export type GmailStatus = 'loading' | 'disconnected' | 'connected';

export interface UseGmailReturn {
  status: GmailStatus;
  email: string | null;
  error: string | null;
  threads: ThreadListItem[];
  loadingThreads: boolean;
  selectedThreadId: string | null;
  messages: ParsedMessage[];
  loadingMessages: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  sending: boolean;
  loadMore: () => Promise<void>;
  selectThread: (id: string | null) => void;
  refreshThreads: () => Promise<void>;
  sendEmail: (params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  startAuth: () => void;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useGmail(): UseGmailReturn {
  const [status, setStatus] = useState<GmailStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const mountedRef = useRef<boolean>(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Check Gmail profile / connection status */
  const checkStatus = useCallback(async () => {
    try {
      const data = await gmail.getStatus();
      if (!mountedRef.current) return;
      if (data.connected && data.email) {
        setStatus('connected');
        setEmail(data.email);
        setError(null);
      } else {
        setStatus('disconnected');
        setEmail(null);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setStatus('disconnected');
      setEmail(null);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, []);

  /* Fetch threads */
  const fetchThreads = useCallback(async (query = '') => {
    setLoadingThreads(true);
    try {
      const res = await gmail.listThreads(query || undefined);
      if (!mountedRef.current) return;
      setThreads(res.threads);
      setNextPageToken(res.nextPageToken);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      console.error('Error fetching threads:', err);
    } finally {
      if (mountedRef.current) setLoadingThreads(false);
    }
  }, []);

  /* Load more threads */
  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await gmail.listThreads(searchQuery || undefined, nextPageToken);
      if (!mountedRef.current) return;
      setThreads((prev) => [...prev, ...res.threads]);
      setNextPageToken(res.nextPageToken);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      console.error('Error loading more threads:', err);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore, searchQuery]);

  /* Fetch messages for selected thread */
  const fetchThreadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await gmail.getThread(threadId);
      if (!mountedRef.current) return;
      setMessages(msgs);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      console.error('Error fetching thread:', err);
      setMessages([]);
    } finally {
      if (mountedRef.current) setLoadingMessages(false);
    }
  }, []);

  /* Select a thread */
  const selectThread = useCallback(
    (id: string | null) => {
      setSelectedThreadId(id);
      if (id) {
        void fetchThreadMessages(id);
      } else {
        setMessages([]);
      }
    },
    [fetchThreadMessages],
  );

  /* Send / Reply email */
  const sendEmail = useCallback(
    async (params: {
      to: string;
      cc?: string;
      subject: string;
      body: string;
      threadId?: string;
      inReplyTo?: string;
      references?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      setSending(true);
      try {
        await gmail.send(params);
        if (params.threadId) {
          await fetchThreadMessages(params.threadId);
        }
        await fetchThreads(searchQuery);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [fetchThreadMessages, fetchThreads, searchQuery],
  );

  /* Disconnect */
  const disconnect = useCallback(async () => {
    try {
      await gmail.disconnect();
      if (!mountedRef.current) return;
      setStatus('disconnected');
      setEmail(null);
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);
    } catch (err: unknown) {
      console.error('Error disconnecting:', err);
    }
  }, []);

  /* Mount effect */
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      void checkStatus();
    }, 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [checkStatus]);

  /* When connected, load threads */
  useEffect(() => {
    if (status === 'connected') {
      const timer = setTimeout(() => {
        void fetchThreads(searchQuery);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [status, fetchThreads, searchQuery]);

  /* Debounced search */
  const handleSetSearchQuery = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        void fetchThreads(q);
      }, 350);
    },
    [fetchThreads],
  );

  return {
    status,
    email,
    error,
    threads,
    loadingThreads,
    selectedThreadId,
    messages,
    loadingMessages,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    hasMore: Boolean(nextPageToken),
    loadingMore,
    sending,
    loadMore,
    selectThread,
    refreshThreads: () => fetchThreads(searchQuery),
    sendEmail,
    startAuth: gmail.startAuth,
    disconnect,
    refresh: checkStatus,
  };
}
