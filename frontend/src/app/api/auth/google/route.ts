import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  AUTHORIZED_PRACTICE_EMAIL,
  generateAuthUrl,
  STATE_COOKIE_NAME,
} from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const url = generateAuthUrl(state, AUTHORIZED_PRACTICE_EMAIL);

    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (err: unknown) {
    const configured = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    );
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: configured ? 'GOOGLE_OAUTH_ERROR' : 'GOOGLE_OAUTH_NOT_CONFIGURED',
          message: configured
            ? message
            : 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local before connecting Gmail.',
        },
      },
      { status: configured ? 502 : 503 },
    );
  }
}
