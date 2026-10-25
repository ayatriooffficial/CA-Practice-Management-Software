import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedClient, getGlobalIntegration } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const globalIntegration = await getGlobalIntegration();

    // Check if we can get an active access token
    const auth = await getAuthenticatedClient(request);

    if (auth) {
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
        // Fallback to active auth email
      }

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          authorized: true,
          email,
          needsReconnect: false,
        },
      });
    }

    // If global integration exists in MongoDB but access token cannot be minted/refreshed
    if (globalIntegration?.email) {
      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          authorized: false,
          email: globalIntegration.email,
          needsReconnect: true,
          reason: 'Gmail authorization expired. Please click Reconnect Gmail to refresh permissions.',
        },
      });
    }

    // Otherwise completely disconnected
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        authorized: false,
        email: null,
        needsReconnect: false,
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
