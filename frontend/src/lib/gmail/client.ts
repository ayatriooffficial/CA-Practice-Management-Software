import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

/* ── Session shape ─────────────────────────────────────────────────── */
export interface GmailSession {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  email?: string;
}

/* ── Cookie names ──────────────────────────────────────────────────── */
export const SESSION_COOKIE_NAME = 'gmail_session';
export const STATE_COOKIE_NAME = 'oauth_state';

/* ── Encryption Secret & TTL ───────────────────────────────────────── */
const PASSWORD =
  process.env.SESSION_SECRET ||
  'complex_password_at_least_32_characters_long_crm_inbox_session_secret_2026';
const KEY = crypto.createHash('sha256').update(PASSWORD).digest(); // 32 bytes
const TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/* ── OAuth2 Scopes & Endpoints ─────────────────────────────────────── */
export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/auth/google/callback'
  );
}

/* ── Authorized Practice Email ─────────────────────────────────────── */
export const AUTHORIZED_PRACTICE_EMAIL =
  process.env.AUTHORIZED_PRACTICE_EMAIL || 'searchaicloud@gmail.com';

export function generateAuthUrl(state: string, loginHint = AUTHORIZED_PRACTICE_EMAIL): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Missing GOOGLE_CLIENT_ID');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    login_hint: loginHint,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    scope: data.scope,
    token_type: data.token_type,
    expiry_date: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expiry_date?: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh token');
  }

  return {
    access_token: data.access_token,
    expiry_date: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

/* ── Session helpers using AES-256-GCM ──────────────────────────────── */
export function sealSession(data: GmailSession): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const jsonStr = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealSession(sealed: string): GmailSession | null {
  try {
    const buf = Buffer.from(sealed, 'base64url');
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted) as GmailSession;
  } catch {
    return null;
  }
}

export async function getSessionFromCookie(request?: NextRequest): Promise<GmailSession | null> {
  const cookieVal =
    request?.cookies?.get(SESSION_COOKIE_NAME)?.value ||
    (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!cookieVal) return null;
  return unsealSession(cookieVal);
}

export function saveSessionToCookie(response: NextResponse, data: GmailSession): void {
  const sealed = sealSession(data);
  response.cookies.set(SESSION_COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function clearStateCookie(response: NextResponse): void {
  response.cookies.set(STATE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

import { google } from 'googleapis';

const BACKEND_API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api/v1';

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export async function saveGlobalIntegrationTokens(data: {
  email: string;
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
  scope?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/integrations/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && Boolean(json.success);
  } catch (err) {
    console.error('Failed to save global integration tokens to backend:', err);
    return false;
  }
}

export async function getGlobalIntegration(): Promise<{
  provider: string;
  email: string;
  refreshToken: string;
  updatedAt: string;
} | null> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/integrations/google`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.data ? json.data : null;
  } catch (err) {
    console.error('Failed to fetch global integration from backend:', err);
    return null;
  }
}

export async function removeGlobalIntegration(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/integrations/google`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to remove global integration from backend:', err);
    return false;
  }
}

/* ── Authenticated client helper ───────────────────────────────────── */
export interface AuthenticatedClient {
  accessToken: string;
  email: string;
}

export async function getAuthenticatedClient(
  request?: NextRequest,
): Promise<AuthenticatedClient | null> {
  // Check mock dev token for development testing
  if (process.env.NODE_ENV !== 'production') {
    const session = await getSessionFromCookie(request);
    if (session?.access_token === 'mock_token') {
      return {
        accessToken: 'mock_token',
        email: session.email || 'practice@ayatrio.com',
      };
    }
  }

  // Fetch the global refresh_token from the backend database (MongoDB Integration schema)
  try {
    const globalIntegration = await getGlobalIntegration();
    if (globalIntegration?.refreshToken) {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: globalIntegration.refreshToken,
      });

      // Google SDK automatically generates a fresh access token on the fly
      const tokenRes = await oauth2Client.getAccessToken();
      const accessToken = tokenRes.token;

      if (accessToken) {
        return {
          accessToken,
          email: globalIntegration.email || AUTHORIZED_PRACTICE_EMAIL,
        };
      }
    }
  } catch (err) {
    console.error('Error refreshing token from global database credentials:', err);
  }

  return null;
}
