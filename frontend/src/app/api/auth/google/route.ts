import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTHORIZED_PRACTICE_EMAIL,
  fetchBackendAuthConfig,
  generateAuthUrl,
  getRedirectUri,
  STATE_COOKIE_NAME,
} from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authConfig = await fetchBackendAuthConfig();
    const redirectUri = authConfig.redirectUri || getRedirectUri(request);

    if (!authConfig.configured && !authConfig.clientId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
            message:
              'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env before connecting Gmail.',
          },
        },
        { status: 503 },
      );
    }

    const state = crypto.randomBytes(16).toString('hex');
    const url = generateAuthUrl(
      state,
      authConfig.authorizedEmail || AUTHORIZED_PRACTICE_EMAIL,
      authConfig.clientId || undefined,
      redirectUri,
    );

    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GOOGLE_OAUTH_ERROR',
          message,
        },
      },
      { status: 502 },
    );
  }
}
