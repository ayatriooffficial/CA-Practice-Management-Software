import { Request } from 'express';

/**
 * Extracts authenticated or request-scoped user ID
 */
export function getUserIdFromRequest(req: Request): string | null {
  if (req.user?.userId) {
    return String(req.user.userId);
  }
  if (req.headers['x-user-id']) {
    return String(req.headers['x-user-id']);
  }
  if (req.query?.userId) {
    return String(req.query.userId);
  }
  return null;
}

/**
 * Extracts organization ID from request
 */
export function getOrgIdFromRequest(req: Request): string | null {
  if (req.user?.orgId) {
    return String(req.user.orgId);
  }
  if (req.headers['x-org-id']) {
    return String(req.headers['x-org-id']);
  }
  if (req.query?.orgId) {
    return String(req.query.orgId);
  }
  return null;
}

export interface IUserContext {
  userId: string | null;
  orgId: string | null;
  email?: string;
  name?: string;
  role?: string;
}

/**
 * Extracts user context (userId, orgId, email, name, role) from request
 */
export function getUserContextFromRequest(req: Request): IUserContext {
  const userId = getUserIdFromRequest(req);
  let orgId = getOrgIdFromRequest(req);

  // Default to primary organization if not explicitly supplied
  if (!orgId) {
    orgId = '6ad9e23bf460aa2e6102c0c6';
  }

  return {
    userId,
    orgId,
    email: req.user?.email || undefined,
    name: req.user?.name || (userId === '6ad9e23bf460aa2e6102c0c8' ? 'Dipak Sahani' : undefined),
    role: req.user?.role || (req.headers['x-user-role'] as string) || undefined,
  };
}
