import { Request, Response } from 'express';
import { IntegrationService } from './integration.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';

export class IntegrationController {
  /**
   * GET /api/v1/integrations/google
   * Returns public integration status without revealing refresh tokens or secrets.
   */
  static getGoogleIntegration = asyncHandler(async (_req: Request, res: Response) => {
    const integration = await IntegrationService.getGoogleIntegration();
    if (!integration) {
      return ApiResponse.success(
        res,
        {
          connected: false,
          email: null,
          provider: 'google',
          needsReconnect: false,
        },
        'No Google integration configured'
      );
    }

    const isExpired =
      !integration.accessToken ||
      !integration.expiryDate ||
      Date.now() >= integration.expiryDate - 30000;

    return ApiResponse.success(
      res,
      {
        provider: integration.provider,
        email: integration.email,
        connected: true,
        authorized: !isExpired,
        needsReconnect: isExpired,
        updatedAt: integration.updatedAt,
      },
      'Google integration status retrieved'
    );
  });

  /**
   * GET /api/v1/integrations/google/auth-config
   * Returns Google client ID and callback URI for building OAuth authorization URL.
   */
  static getAuthConfig = asyncHandler(async (_req: Request, res: Response) => {
    const config = IntegrationService.getAuthConfig();
    return ApiResponse.success(res, config, 'Google OAuth config retrieved');
  });

  /**
   * GET /api/v1/integrations/google/access-token
   * Returns a valid, auto-refreshed access token for backend/server requests.
   */
  static getAccessToken = asyncHandler(async (_req: Request, res: Response) => {
    const result = await IntegrationService.getValidAccessToken();
    if (!result.ok) {
      return ApiResponse.error(
        res,
        result.error || 'Failed to acquire valid Google access token',
        result.needsReconnect ? 401 : 404,
        {
          connected: Boolean(result.email),
          needsReconnect: Boolean(result.needsReconnect),
          email: result.email || null,
        }
      );
    }

    return ApiResponse.success(
      res,
      {
        accessToken: result.accessToken,
        email: result.email,
        provider: 'google',
      },
      'Access token acquired'
    );
  });

  /**
   * POST /api/v1/integrations/google/exchange
   * Exchanges authorization code for tokens directly on the backend server.
   */
  static exchangeCode = asyncHandler(async (req: Request, res: Response) => {
    const { code, redirectUri } = req.body;
    if (!code) {
      return ApiResponse.error(res, 'Authorization code is required', 400);
    }

    const effectiveRedirectUri =
      redirectUri ||
      IntegrationService.getAuthConfig().redirectUri;

    try {
      const data = await IntegrationService.exchangeAuthCode(code, effectiveRedirectUri);
      return ApiResponse.success(res, data, 'Google account authorized successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'OAuth exchange failed', 400);
    }
  });

  /**
   * POST /api/v1/integrations/google
   * Upsert integration credentials directly (backward compatibility).
   */
  static upsertGoogleIntegration = asyncHandler(async (req: Request, res: Response) => {
    const { email, refreshToken, accessToken, expiryDate, scope } = req.body;
    if (!email || !refreshToken) {
      return ApiResponse.error(res, 'Email and refreshToken are required', 400);
    }

    const updated = await IntegrationService.upsertGoogleIntegration({
      email,
      refreshToken,
      accessToken,
      expiryDate,
      scope,
    });

    return ApiResponse.success(
      res,
      {
        provider: updated.provider,
        email: updated.email,
        updatedAt: updated.updatedAt,
      },
      'Google integration credentials saved successfully'
    );
  });

  /**
   * DELETE /api/v1/integrations/google
   * Disconnects Google integration.
   */
  static disconnectGoogle = asyncHandler(async (_req: Request, res: Response) => {
    await IntegrationService.removeGoogleIntegration();
    return ApiResponse.success(res, null, 'Google integration removed');
  });
}
