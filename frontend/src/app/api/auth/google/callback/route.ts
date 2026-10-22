import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearStateCookie,
  exchangeCodeForTokens,
  getSessionFromCookie,
  saveSessionToCookie,
  STATE_COOKIE_NAME,
} from '@/lib/gmail/client';
import type { GmailSession } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || state !== request.cookies.get(STATE_COOKIE_NAME)?.value) {
    return NextResponse.redirect(
      new URL('/email?error=OAuth+state+validation+failed', request.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    let email = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userRes.ok) {
        const userInfo = await userRes.json();
        email = userInfo.email || '';
      }
    } catch {
      // Fallback if userinfo fails
    }

    const existing = await getSessionFromCookie(request);

    const sessionData: GmailSession = {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || existing?.refresh_token,
      scope: tokens.scope || undefined,
      token_type: tokens.token_type || undefined,
      expiry_date: tokens.expiry_date || undefined,
      email: email || existing?.email || undefined,
    };

    const response = NextResponse.redirect(
      new URL('/email?gmail=connected', request.url),
    );
    saveSessionToCookie(response, sessionData);
    clearStateCookie(response);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
