/* Gmail integration service (client-side).
   Components call these helpers or the useGmail hook. Tokens never reach
   browser JS — all calls go through our Next.js API routes. */

export interface GmailStatusData {
  connected: boolean;
  email: string | null;
}

/** Check whether Gmail is connected and return email if so. */
export async function getStatus(): Promise<GmailStatusData> {
  const res = await fetch('/api/gmail/status');
  const json = (await res.json()) as {
    success: boolean;
    data?: GmailStatusData;
    error?: { message: string };
  };
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch Gmail status');
  return json.data || { connected: false, email: null };
}

/** Start the Google OAuth flow (full-page redirect). */
export function startAuth(): void {
  window.location.assign('/api/auth/google');
}

/** Disconnect Gmail (clear session cookie). */
export async function disconnect(): Promise<void> {
  const res = await fetch('/api/gmail/disconnect', { method: 'POST' });
  const json = (await res.json()) as { ok: boolean };
  if (!json.ok) throw new Error('Failed to disconnect Gmail');
}

export interface ThreadListItem {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  unread: boolean;
  messageCount: number;
}

export async function listThreads(
  q?: string,
  pageToken?: string,
): Promise<{ threads: ThreadListItem[]; nextPageToken: string | null }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (pageToken) params.set('pageToken', pageToken);
  const res = await fetch(`/api/gmail/threads?${params.toString()}`);
  const json = (await res.json()) as {
    ok: boolean;
    threads?: ThreadListItem[];
    nextPageToken?: string | null;
    error?: string;
  };
  if (!json.ok) throw new Error(json.error || 'Failed to list threads');
  return { threads: json.threads || [], nextPageToken: json.nextPageToken || null };
}

export interface AttachmentRef {
  filename: string;
  mimeType: string;
  size?: number;
  attachmentId?: string;
}

export interface ParsedMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  messageIdHeader: string;
  references: string;
  labelIds: string[];
  attachments: AttachmentRef[];
}

export async function getThread(id: string): Promise<ParsedMessage[]> {
  const res = await fetch(`/api/gmail/thread/${encodeURIComponent(id)}`);
  const json = (await res.json()) as {
    ok: boolean;
    messages?: ParsedMessage[];
    error?: string;
  };
  if (!json.ok) throw new Error(json.error || 'Failed to fetch thread messages');
  return json.messages || [];
}

export async function send(params: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ id: string; threadId: string }> {
  const res = await fetch('/api/gmail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as {
    ok: boolean;
    id?: string;
    threadId?: string;
    error?: string;
  };
  if (!json.ok) throw new Error(json.error || 'Failed to send email');
  return { id: json.id || '', threadId: json.threadId || '' };
}
