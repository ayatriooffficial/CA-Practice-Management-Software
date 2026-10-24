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

    if (process.env.NODE_ENV !== 'production' && auth.accessToken === 'mock_token') {
      return NextResponse.json({
        ok: true,
        threads: [
          {
            id: 'mock-thread-1',
            subject: 'Quotation QT-2026-0089 from Ayatrio Practice',
            from: 'Priya Sharma <priyasharma@gmail.com>',
            snippet: 'Please find attached the details for Quotation QT-2026-0089 regarding GST Annual Return Filing...',
            date: 'Today, 2:30 PM',
            unread: false,
            messageCount: 1,
          },
          {
            id: 'mock-thread-2',
            subject: 'Tax Audit Documentation Update',
            from: 'Rajesh Gupta <rajesh@guptafinance.com>',
            snippet: 'Please find attached the financial statements and books of accounts for AY 2025-26.',
            date: 'Yesterday, 5:15 PM',
            unread: true,
            messageCount: 1,
          },
        ],
        nextPageToken: null,
      });
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
