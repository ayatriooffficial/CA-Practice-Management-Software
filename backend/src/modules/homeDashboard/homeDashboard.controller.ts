import { Request, Response } from 'express';
import { HomeDashboardService } from './homeDashboard.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';

function resolveAccountKey(req: Request): {
  accountKey: string;
  userId: string;
  userEmail: string;
  role: string;
  orgId: string;
} {
  const user = req.user;
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  const headerRole = req.headers['x-user-role'] as string | undefined;
  const headerOrgId = req.headers['x-org-id'] as string | undefined;

  const userId = user?.userId || headerUserId || (req.body?.userId as string) || '';
  const userEmail = (user?.email || (req.body?.userEmail as string) || '').toLowerCase().trim();
  const role = (user?.role || headerRole || (req.body?.role as string) || 'admin').toLowerCase().trim();
  const orgId = user?.orgId || headerOrgId || (req.body?.orgId as string) || '';

  // Account key isolates each individual user account; fall back to role-scoped key if unauthenticated
  const accountKey = userId
    ? `user_${userId}`
    : userEmail
    ? `email_${userEmail}`
    : `role_${role}`;

  return { accountKey, userId, userEmail, role, orgId };
}

export class HomeDashboardController {
  /**
   * GET /api/v1/home/metrics-snapshot
   * Returns instant numerical metrics snapshot without executing any heavy aggregations.
   */
  static getMetricsSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const { accountKey, role } = resolveAccountKey(req);
    const metrics = await HomeDashboardService.getSnapshot(accountKey, role);

    return ApiResponse.success(
      res,
      metrics,
      metrics
        ? 'Home numerical metrics snapshot retrieved successfully'
        : 'No pre-calculated metrics snapshot found for this account'
    );
  });

  /**
   * POST /api/v1/home/metrics-snapshot
   * Saves or refreshes the latest numerical snapshot for this user's account.
   */
  static saveMetricsSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const { accountKey, userId, userEmail, role, orgId } = resolveAccountKey(req);
    const metrics = req.body?.metrics || req.body;

    if (!metrics || typeof metrics !== 'object') {
      return ApiResponse.error(res, 'Valid numerical metrics payload is required', 400);
    }

    await HomeDashboardService.saveSnapshot(
      accountKey,
      { userId, userEmail, role, orgId },
      metrics
    );

    return ApiResponse.success(
      res,
      { saved: true, accountKey },
      'Home numerical metrics snapshot persisted'
    );
  });
}

