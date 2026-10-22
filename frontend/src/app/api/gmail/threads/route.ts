import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedClient } from '@/lib/gmail/client';
import { parseThreadListItem } from '@/lib/gmail/parse';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const query = params.get('q') || '';
    const pageToken = params.get('pageToken') || undefined;

    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
    listUrl.searchParams.set('maxResults', '20');
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken);
    if (query) {
      listUrl.searchParams.set('q', query);
    } else {
      listUrl.searchParams.append('labelIds', 'INBOX');
    }

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (!listRes.ok) {
      const errJson = await listRes.json().catch(() => ({}));
      return NextResponse.json(
        { ok: false, error: errJson.error?.message || 'Failed to list threads' },
        { status: listRes.status },
      );
    }

    const listData = await listRes.json();
    const threadSummaries: { id: string }[] = listData.threads || [];

    const threads = await Promise.all(
      threadSummaries.map(async (item) => {
        if (!item.id) return null;
        try {
          const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
          const detailRes = await fetch(detailUrl, {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });

          if (!detailRes.ok) throw new Error('Detail fetch failed');
          const threadDetail = await detailRes.json();

          return parseThreadListItem({
            id: item.id,
            snippet: threadDetail.snippet || undefined,
            messages: (threadDetail.messages || []).map((m: Record<string, unknown>) => ({
              id: (m.id as string) || '',
              labelIds: (m.labelIds as string[]) || [],
              snippet: (m.snippet as string) || undefined,
              payload: {
                headers: (((m.payload as Record<string, unknown>)?.headers as Array<{ name?: string; value?: string }>) || []).map((h) => ({
                  name: h.name || '',
                  value: h.value || '',
                })),
              },
            })),
          });
        } catch {
          return {
            id: item.id,
            subject: '(No Subject)',
            from: '',
            snippet: '',
            date: '',
            unread: false,
            messageCount: 1,
          };
        }
      }),
    );

    const validThreads = threads.filter(Boolean);

    return NextResponse.json({
      ok: true,
      threads: validThreads,
      nextPageToken: listData.nextPageToken || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
