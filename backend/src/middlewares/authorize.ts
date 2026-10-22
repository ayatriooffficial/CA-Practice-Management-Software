import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../shared/utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';
import { UserRole } from '../modules/auth/auth.interface';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user has one of the required roles.
 * Example: authorize(['admin', 'partner'])
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.error(
        res,
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ApiResponse.error(
        res,
        `Forbidden: Insufficient privileges. Required role(s): ${allowedRoles.join(', ')}`,
        HTTP_STATUS.FORBIDDEN
      );
      return;
    }

    next();
  };
};

/**
 * Granular module permission check.
 * Example: requirePermission('invoice', 'delete')
 */
export const requirePermission = (moduleName: string, action: 'view' | 'addEdit' | 'delete' | 'import' | 'export') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.error(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    // Admins and Partners have full bypass access
    if (req.user.role === 'admin' || req.user.role === 'partner') {
      return next();
    }

    const perms = req.user.permissions?.[moduleName];
    if (!perms || !perms[action]) {
      ApiResponse.error(
        res,
        `Forbidden: You do not have permission to ${action} in ${moduleName}`,
        HTTP_STATUS.FORBIDDEN
      );
      return;
    }

    next();
  };
};
