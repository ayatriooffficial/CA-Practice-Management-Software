import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearStateCookie,
  exchangeCodeForTokens,
  getRedirectUri,
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
    const redirectUri = getRedirectUri(request);
    await exchangeCodeForTokens(code, redirectUri);

    const response = NextResponse.redirect(
      new URL('/email?gmail=connected', request.url),
    );
    clearStateCookie(response);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const response = NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(message)}`, request.url),
    );
    clearStateCookie(response);
    return response;
  }
}
