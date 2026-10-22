import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedClient } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json({
        success: true,
        data: { connected: false, email: null },
      });
    }

    let email = auth.email;
    try {
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        email = profile.emailAddress || auth.email;
      }
    } catch {
      // Use existing email from session
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        email,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'GMAIL_STATUS_ERROR', message },
      },
      { status: 502 },
    );
  }
}
