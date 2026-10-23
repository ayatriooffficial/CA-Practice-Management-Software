import { Request, Response, NextFunction } from 'express';
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

  // Also support X-User-Id and query userId for multi-client testing
  if (!req.user && (req.headers['x-user-id'] || req.query.userId)) {
    const rawUserId = String(req.headers['x-user-id'] || req.query.userId);
    req.user = {
      userId: rawUserId,
      orgId: String(req.headers['x-org-id'] || ''),
      firmName: '',
      email: '',
      role: (req.headers['x-user-role'] as any) || 'admin',
      name: '',
      initials: '',
      tokenVersion: 0,
    };
  }

  next();
};
