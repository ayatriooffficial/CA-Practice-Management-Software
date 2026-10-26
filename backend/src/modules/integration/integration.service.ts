import { IntegrationModel } from './integration.model';
import { IIntegrationDocument } from './integration.interface';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  getGoogleOAuthCredentials,
  refreshGoogleAccessToken,
} from '../../shared/utils/mailService';

export const AUTHORIZED_PRACTICE_EMAIL =
  process.env.AUTHORIZED_PRACTICE_EMAIL ||
  env.AUTHORIZED_PRACTICE_EMAIL ||
  'searchaicloud@gmail.com';

export interface ValidAccessTokenResult {
  ok: boolean;
  accessToken?: string;
  email?: string;
  needsReconnect?: boolean;
  error?: string;
}

export class IntegrationService {
  /**
   * Upsert a Google integration document with refresh token and practice email.
   */
  static async upsertGoogleIntegration(data: {
    email: string;
    refreshToken: string;
    accessToken?: string;
    expiryDate?: number;
    scope?: string;
  }): Promise<IIntegrationDocument> {
    const updated = await IntegrationModel.findOneAndUpdate(
      { provider: 'google' },
      {
        provider: 'google',
        email: data.email.toLowerCase(),
        refreshToken: data.refreshToken,
        ...(data.accessToken ? { accessToken: data.accessToken } : {}),
        ...(data.expiryDate ? { expiryDate: data.expiryDate } : {}),
        ...(data.scope ? { scope: data.scope } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return updated;
  }

  /**
   * Retrieve Google integration document.
   */
  static async getGoogleIntegration(): Promise<IIntegrationDocument | null> {
    return await IntegrationModel.findOne({ provider: 'google' }).exec();
  }

  /**
   * Remove Google integration (disconnect).
   */
  static async removeGoogleIntegration(): Promise<boolean> {
    const res = await IntegrationModel.deleteOne({ provider: 'google' });
    return res.deletedCount > 0;
  }

  /**
   * Get an active, unexpired Google access token on the fly.
   * Transparently refreshes the token using backend client credentials if expired.
   */
  static async getValidAccessToken(): Promise<ValidAccessTokenResult> {
    const integration = await IntegrationModel.findOne({ provider: 'google' }).lean().exec();
    if (!integration || !integration.email) {
      return { ok: false, error: 'No Google integration configured' };
    }

    const isExpired =
      !integration.accessToken ||
      !integration.expiryDate ||
      Date.now() >= integration.expiryDate - 30000;

    if (!isExpired && integration.accessToken) {
      return {
        ok: true,
        accessToken: integration.accessToken,
        email: integration.email,
      };
    }

    if (integration.refreshToken) {
      const refreshed = await refreshGoogleAccessToken(integration.refreshToken);
      if (refreshed.accessToken) {
        return {
          ok: true,
          accessToken: refreshed.accessToken,
          email: integration.email,
        };
      }
      return {
        ok: false,
        needsReconnect: true,
        email: integration.email,
        error: refreshed.error || 'Failed to refresh Google access token',
      };
    }

    return {
      ok: false,
      needsReconnect: true,
      email: integration.email,
      error: 'Missing refresh token for Google integration',
    };
  }

  /**
   * Exchange an OAuth authorization code for Google tokens on the backend server.
   * Validates the practice email against AUTHORIZED_PRACTICE_EMAIL and persists in MongoDB.
   */
  static async exchangeAuthCode(
    code: string,
    redirectUri: string
  ): Promise<{ email: string; provider: string; connected: boolean }> {
    const { clientId, clientSecret } = getGoogleOAuthCredentials();
    if (!clientId || !clientSecret) {
      throw new Error(
        'Google OAuth client credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in backend/.env'
      );
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json().catch(() => ({}))) as Record<string, any>;
    if (!tokenRes.ok) {
      const errMsg =
        tokenData.error_description || tokenData.error || `Token exchange failed with HTTP ${tokenRes.status}`;
      throw new Error(errMsg);
    }

    const accessToken = tokenData.access_token as string;
    let refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = Number(tokenData.expires_in) || 3600;
    const expiryDate = Date.now() + expiresIn * 1000;
    const scope = tokenData.scope as string | undefined;

    // Retrieve userinfo to verify authenticated email
    let userEmail = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userInfo = (await userRes.json().catch(() => ({}))) as Record<string, any>;
        userEmail = (userInfo.email || '').trim().toLowerCase();
      }
    } catch (err: any) {
      logger.warn(`Failed to fetch userinfo during OAuth code exchange: ${err?.message}`);
    }

    // Strict single-account practice check
    const expectedEmail = AUTHORIZED_PRACTICE_EMAIL.trim().toLowerCase();
    if (!userEmail || userEmail !== expectedEmail) {
      throw new Error(
        `Unauthorized Google Account (${userEmail || 'unknown'}). Only ${expectedEmail} is authorized to connect the practice inbox.`
      );
    }

    // If Google didn't return a refresh_token (e.g. repeated consent without prompt=consent), preserve existing
    if (!refreshToken) {
      const existing = await IntegrationModel.findOne({ provider: 'google' }).lean().exec();
      refreshToken = existing?.refreshToken;
    }

    if (!refreshToken) {
      throw new Error(
        'Google did not return a refresh token. Please revoke application access and reconnect with consent prompt.'
      );
    }

    await IntegrationService.upsertGoogleIntegration({
      email: userEmail,
      refreshToken,
      accessToken,
      expiryDate,
      scope,
    });

    logger.info(`✅ Successfully authorized global Google practice integration for ${userEmail}`);
    return {
      email: userEmail,
      provider: 'google',
      connected: true,
    };
  }

  /**
   * Get public OAuth client configuration for initiating consent flow.
   */
  static getAuthConfig(): {
    clientId: string | null;
    authorizedEmail: string;
    redirectUri: string;
    configured: boolean;
  } {
    const { clientId, clientSecret } = getGoogleOAuthCredentials();
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/auth/google/callback';

    return {
      clientId: clientId || null,
      authorizedEmail: AUTHORIZED_PRACTICE_EMAIL,
      redirectUri,
      configured: Boolean(clientId && clientSecret),
    };
  }
}
