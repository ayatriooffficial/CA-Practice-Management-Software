import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { JwtService } from '../modules/auth/jwt.service';
import { ApiResponse } from '../shared/utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';
import { IJwtUserPayload } from '../modules/auth/auth.interface';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IJwtUserPayload;
    }
  }
}

const DEV_FALLBACK_USER_ID = '6ad9e23bf460aa2e6102c0c8';
const DEV_FALLBACK_ORG_ID = '6ad9e23bf460aa2e6102c0c6';

/**
 * Strict JWT Authentication Middleware.
 * Extracts Bearer token from Authorization header, validates signature & expiry,
 * and attaches decoded user to req.user.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ApiResponse.error(
      res,
      'Access denied. No authentication token provided.',
      HTTP_STATUS.UNAUTHORIZED
    );
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = JwtService.verifyAccessToken(token);
    req.user = decoded;

    // Attach to headers for downstream compatibility
    if (decoded.userId) req.headers['x-user-id'] = decoded.userId;
    if (decoded.orgId) req.headers['x-org-id'] = decoded.orgId;
    if (decoded.role) req.headers['x-user-role'] = decoded.role;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      ApiResponse.error(
        res,
        'Token has expired. Please refresh your session.',
        HTTP_STATUS.UNAUTHORIZED
      );
      return;
    }

    ApiResponse.error(
      res,
      'Invalid authentication token.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};

/**
 * Optional Authentication Middleware.
 * Attaches user if valid token exists, but doesn't block unauthenticated requests.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = JwtService.verifyAccessToken(token);
      req.user = decoded;
      if (decoded.userId) req.headers['x-user-id'] = decoded.userId;
      if (decoded.orgId) req.headers['x-org-id'] = decoded.orgId;
      if (decoded.role) req.headers['x-user-role'] = decoded.role;
    } catch {
      // Ignore token validation failure in optional mode
    }
  }

  // Also support X-User-Id and query userId for multi-client testing or dev fallback
  if (!req.user && (req.headers['x-user-id'] || req.query.userId || process.env.NODE_ENV !== 'production')) {
    const rawUserId = String(req.headers['x-user-id'] || req.query.userId || DEV_FALLBACK_USER_ID);
    const validUserId = mongoose.Types.ObjectId.isValid(rawUserId) ? rawUserId : DEV_FALLBACK_USER_ID;
    const rawOrgId = String(req.headers['x-org-id'] || req.query.orgId || DEV_FALLBACK_ORG_ID);
    const validOrgId = mongoose.Types.ObjectId.isValid(rawOrgId) ? rawOrgId : DEV_FALLBACK_ORG_ID;

    req.user = {
      userId: validUserId,
      orgId: validOrgId,
      firmName: 'Krishna Associates',
      email: 'deepak.sahani@krishnaassociates.example',
      role: (req.headers['x-user-role'] as any) || 'admin',
      name: 'Deepak Sahani',
      initials: 'DS',
      tokenVersion: 0,
    };
    req.headers['x-user-id'] = validUserId;
    req.headers['x-org-id'] = validOrgId;
  }

  next();
};
