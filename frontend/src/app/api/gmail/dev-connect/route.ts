import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveSessionToCookie } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL('/email', request.url));
  saveSessionToCookie(response, {
    access_token: 'mock_token',
    email: 'practice@ayatrio.com',
  });
  return response;
}
