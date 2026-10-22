import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedClient } from '@/lib/gmail/client';
import { buildRaw } from '@/lib/gmail/mime';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { to, cc, subject, body, threadId, inReplyTo, references } =
      (await request.json()) as {
        to?: string;
        cc?: string;
        subject?: string;
        body?: string;
        threadId?: string;
        inReplyTo?: string;
        references?: string;
      };

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()) || !body?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Valid recipient email and message body are required.' },
        { status: 400 },
      );
    }

    const raw = buildRaw({
      to: to.trim(),
      from: auth.email,
      cc: cc?.trim() || undefined,
      subject: subject || '(No Subject)',
      body: body.trim(),
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
    });

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw,
        threadId: threadId || undefined,
      }),
    });

    if (!sendRes.ok) {
      const errJson = await sendRes.json().catch(() => ({}));
      return NextResponse.json(
        { ok: false, error: errJson.error?.message || 'Failed to send message' },
        { status: sendRes.status },
      );
    }

    const result = await sendRes.json();

    return NextResponse.json({
      ok: true,
      id: result.id,
      threadId: result.threadId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
