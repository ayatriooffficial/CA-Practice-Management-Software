import { NextResponse } from 'next/server';
import { clearSessionCookie, removeGlobalIntegration } from '@/lib/gmail/client';

export const runtime = 'nodejs';

export async function POST() {
  await removeGlobalIntegration();
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
