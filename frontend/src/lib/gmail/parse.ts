/* Gmail message / thread parsing helpers (server-only). */

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayloadPart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPayloadPart[];
}

export interface GmailPayload extends GmailPayloadPart {
  headers?: GmailHeader[];
  snippet?: string;
}

export interface GmailMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailPayload;
}

export interface GmailThread {
  id: string;
  snippet?: string;
  messages?: GmailMessage[];
}

/* ── Helpers ───────────────────────────────────────────────────────── */
export function getHeader(headers: GmailHeader[] = [], name: string): string {
  return (
    headers.find((h) => h?.name?.toLowerCase() === name.toLowerCase())?.value || ''
  );
}

export function decodeBase64Url(value = ''): string {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
    'utf8',
  );
}

/* ── Body extraction ───────────────────────────────────────────────── */
export function extractBody(payload: GmailPayloadPart | undefined): {
  bodyText: string;
  bodyHtml: string;
} {
  let text = '';
  let html = '';

  function walk(part: GmailPayloadPart | undefined) {
    if (!part) return;
    if (part.body?.data && part.mimeType === 'text/plain' && !text)
      text = decodeBase64Url(part.body.data);
    if (part.body?.data && part.mimeType === 'text/html' && !html)
      html = decodeBase64Url(part.body.data);
    (part.parts || []).forEach(walk);
  }

  walk(payload);

  return {
    bodyText: text || (html ? stripHtml(html) : (payload as GmailPayload)?.snippet || ''),
    bodyHtml: html,
  };
}

export interface AttachmentRef {
  filename: string;
  mimeType: string;
  size?: number;
  attachmentId?: string;
}

export function extractAttachments(
  payload: GmailPayloadPart | undefined,
): AttachmentRef[] {
  const attachments: AttachmentRef[] = [];

  function walk(part: GmailPayloadPart | undefined) {
    if (!part) return;
    if (part.filename && part.filename.trim().length > 0) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body?.size,
        attachmentId: part.body?.attachmentId,
      });
    }
    (part.parts || []).forEach(walk);
  }

  walk(payload);
  return attachments;
}

/** Robust HTML sanitizer that strips scripts, dangerous tags, and inline event handlers. */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?(?:iframe|object|embed|applet|form|input|button|meta|link)\b[^>]*>/gi, '')
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|src)\s*=\s*["']?\s*javascript:[^"'>\s]+/gi, 'data-unsafe-href=""');
}

/** Minimal HTML → plain-text strip (server-safe). */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/* ── Thread parsing ────────────────────────────────────────────────── */
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

export function parseThread(thread: GmailThread): { messages: ParsedMessage[] } {
  return {
    messages: (thread?.messages || []).map((message) => {
      const headers = message.payload?.headers || [];
      const body = extractBody(message.payload);
      const attachments = extractAttachments(message.payload);
      return {
        id: message.id,
        threadId: message.threadId || thread.id,
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject') || '(No Subject)',
        date:
          getHeader(headers, 'Date') ||
          new Date(Number(message.internalDate || Date.now())).toUTCString(),
        bodyText: body.bodyText,
        bodyHtml: body.bodyHtml ? sanitizeHtml(body.bodyHtml) : '',
        messageIdHeader: getHeader(headers, 'Message-ID'),
        references: getHeader(headers, 'References'),
        labelIds: message.labelIds || [],
        attachments,
      };
    }),
  };
}

/* ── Thread list item parsing ──────────────────────────────────────── */
export interface ThreadListItem {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  unread: boolean;
  messageCount: number;
}

export function parseThreadListItem(thread: GmailThread): ThreadListItem {
  const message = thread?.messages?.[thread.messages.length - 1];
  const headers = message?.payload?.headers || [];
  return {
    id: thread.id,
    subject: getHeader(headers, 'Subject') || '(No Subject)',
    from: getHeader(headers, 'From'),
    snippet: thread.snippet || message?.snippet || '',
    date: getHeader(headers, 'Date'),
    unread: (thread.messages || []).some((m) => m.labelIds?.includes('UNREAD')),
    messageCount: thread.messages?.length || 1,
  };
}
