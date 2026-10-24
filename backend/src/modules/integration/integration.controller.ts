import { Request, Response } from 'express';
import { IntegrationService } from './integration.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';

export class IntegrationController {
  static getGoogleIntegration = asyncHandler(async (_req: Request, res: Response) => {
    const integration = await IntegrationService.getGoogleIntegration();
    if (!integration) {
      return ApiResponse.success(res, null, 'No Google integration configured');
    }
    return ApiResponse.success(
      res,
      {
        provider: integration.provider,
        email: integration.email,
        refreshToken: integration.refreshToken,
        updatedAt: integration.updatedAt,
      },
      'Google integration retrieved'
    );
  });

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

  static disconnectGoogle = asyncHandler(async (_req: Request, res: Response) => {
    await IntegrationService.removeGoogleIntegration();
    return ApiResponse.success(res, null, 'Google integration removed');
  });
}
