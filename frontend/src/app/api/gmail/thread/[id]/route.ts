import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedClient } from '@/lib/gmail/client';
import { parseThread } from '@/lib/gmail/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing thread id' }, { status: 400 });
    }

    const threadUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(id)}?format=full`;
    const threadRes = await fetch(threadUrl, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (!threadRes.ok) {
      const errJson = await threadRes.json().catch(() => ({}));
      return NextResponse.json(
        { ok: false, error: errJson.error?.message || 'Failed to fetch thread' },
        { status: threadRes.status },
      );
    }

    const thread = await threadRes.json();

    const parsed = parseThread({
      id,
      snippet: thread.snippet || undefined,
      messages: (thread.messages || []).map((m: Record<string, unknown>) => {
        const payload = (m.payload as Record<string, unknown>) || {};
        return {
          id: (m.id as string) || '',
          threadId: (m.threadId as string) || id,
          internalDate: (m.internalDate as string) || undefined,
          labelIds: (m.labelIds as string[]) || [],
          snippet: (m.snippet as string) || undefined,
          payload: {
            mimeType: (payload.mimeType as string) || undefined,
            body: payload.body ? { data: (payload.body as { data?: string }).data || undefined } : undefined,
            headers: (((payload.headers as Array<{ name?: string; value?: string }>) || [])).map((h) => ({
              name: h.name || '',
              value: h.value || '',
            })),
            parts: ((payload.parts as Array<Record<string, unknown>>) || []).map(function mapPart(part): Record<string, unknown> {
              const body = part.body as { data?: string; attachmentId?: string; size?: number } | undefined;
              return {
                mimeType: (part.mimeType as string) || undefined,
                filename: (part.filename as string) || undefined,
                body: body
                  ? {
                      data: body.data || undefined,
                      attachmentId: body.attachmentId || undefined,
                      size: body.size || undefined,
                    }
                  : undefined,
                parts: ((part.parts as Array<Record<string, unknown>>) || []).map(mapPart),
              };
            }),
          },
        };
      }),
    });

    return NextResponse.json({ ok: true, messages: parsed.messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
