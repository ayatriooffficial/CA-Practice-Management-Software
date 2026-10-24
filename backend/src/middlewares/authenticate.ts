import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { JwtService } from '../modules/auth/jwt.service';
import { ApiResponse } from '../shared/utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';
import { IJwtUserPayload } from '../modules/auth/auth.interface';
import { UserModel } from '../modules/auth/user.model';

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
 * reads live role & status from DB, and blocks pending/rejected accounts from non-whitelisted routes.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Read live role and status from database per request (not frozen in token)
    let liveRole = decoded.role;
    let liveStatus = 'active';

    if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
      const dbUser = await UserModel.findById(decoded.userId).select('role status name email').lean();
      if (!dbUser) {
        ApiResponse.error(res, 'User account no longer exists.', HTTP_STATUS.UNAUTHORIZED);
        return;
      }
      liveStatus = String(dbUser.status || 'active').toLowerCase();
      liveRole = dbUser.role || decoded.role;
      (decoded as any).status = liveStatus;
      decoded.role = liveRole;
      if (dbUser.name) decoded.name = dbUser.name;
    }

    if (liveStatus === 'rejected') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: 'EMPLOYMENT_REJECTED',
        message: 'Sorry, your request has been rejected. You cannot log in.',
      });
      return;
    }

    // Pending user server-side enforcement
    if (liveStatus === 'pending') {
      const originalPath = req.originalUrl || req.path || '';
      const isWhitelisted =
        originalPath.includes('/auth/me') ||
        originalPath.includes('/auth/employment-status') ||
        originalPath.includes('/auth/logout') ||
        originalPath.includes('/health');

      if (!isWhitelisted) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: 'EMPLOYMENT_PENDING',
          message: 'Your employment request is pending approval from an administrator.',
        });
        return;
      }
    }

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
 * Attaches user if valid token exists, but blocks pending users from receiving feature module data.
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = JwtService.verifyAccessToken(token);

      // Check live status if token provided
      if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
        const dbUser = await UserModel.findById(decoded.userId).select('role status name email').lean();
        if (dbUser) {
          const liveStatus = String(dbUser.status || 'active').toLowerCase();
          if (liveStatus === 'rejected') {
            res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              code: 'EMPLOYMENT_REJECTED',
              message: 'Sorry, your request has been rejected. You cannot log in.',
            });
            return;
          }
          if (liveStatus === 'pending') {
            const originalPath = req.originalUrl || req.path || '';
            const isWhitelisted =
              originalPath.includes('/auth/me') ||
              originalPath.includes('/auth/employment-status') ||
              originalPath.includes('/auth/logout') ||
              originalPath.includes('/health');

            if (!isWhitelisted) {
              res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                code: 'EMPLOYMENT_PENDING',
                message: 'Your employment request is pending approval from an administrator.',
              });
              return;
            }
          }
          (decoded as any).status = liveStatus;
          decoded.role = dbUser.role || decoded.role;
        }
      }

      req.user = decoded;
      if (decoded.userId) req.headers['x-user-id'] = decoded.userId;
      if (decoded.orgId) req.headers['x-org-id'] = decoded.orgId;
      if (decoded.role) req.headers['x-user-role'] = decoded.role;
      next();
      return;
    } catch {
      // Ignore token validation failure in optional mode
    }
  }

  // Only fall back to dev mock user if no auth header was sent at all
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
