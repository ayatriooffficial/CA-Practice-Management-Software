import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTHORIZED_PRACTICE_EMAIL,
  clearStateCookie,
  exchangeCodeForTokens,
  saveGlobalIntegrationTokens,
  STATE_COOKIE_NAME,
} from '@/lib/gmail/client';

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

    // Strict validation check: abort session creation if not authorized practice email
    if (!email || email.toLowerCase() !== AUTHORIZED_PRACTICE_EMAIL.toLowerCase()) {
      const unauthorizedResponse = NextResponse.redirect(
        new URL('/email?error=UnauthorizedAccount', request.url),
      );
      clearStateCookie(unauthorizedResponse);
      return unauthorizedResponse;
    }

    // Save the global refresh_token into the backend MongoDB Integration schema
    if (tokens.refresh_token) {
      await saveGlobalIntegrationTokens({
        email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
      });
    }

    const response = NextResponse.redirect(
      new URL('/email?gmail=connected', request.url),
    );
    clearStateCookie(response);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
