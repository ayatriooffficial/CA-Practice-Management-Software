import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'turia_refresh_token';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
}

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.registerOrganization({
        ...req.body,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setRefreshCookie(res, result.tokens.refreshToken);

      ApiResponse.created(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
        },
        'Organization and administrator account registered successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async lookup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, type } = req.body;
      const user = await AuthService.lookupUser(identifier, type);
      ApiResponse.success(
        res,
        { exists: Boolean(user), user: user || null },
        user ? 'Account found' : 'Account not found'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { target, type } = req.body;
      const result = await AuthService.sendOtp(target, type);
      ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  public static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { target, code } = req.body;
      const result = await AuthService.verifyOtp(target, code, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setRefreshCookie(res, result.tokens.refreshToken);

      ApiResponse.success(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
        },
        'Logged in successfully via OTP'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginWithPassword(email, password, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setRefreshCookie(res, result.tokens.refreshToken);

      ApiResponse.success(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
        },
        'Logged in successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (!rawToken) {
        ApiResponse.error(res, 'No refresh token provided', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const result = await AuthService.rotateRefreshToken(rawToken, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setRefreshCookie(res, result.refreshToken);

      ApiResponse.success(
        res,
        {
          accessToken: result.accessToken,
          user: result.user,
          expiresIn: 15 * 60,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      await AuthService.logout(rawToken);
      clearRefreshCookie(res);
      ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as any).user;
      if (!authUser || !authUser.userId) {
        ApiResponse.error(res, 'Not authenticated', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const user = await AuthService.getCurrentUser(authUser.userId);
      ApiResponse.success(res, user, 'Current authenticated user profile');
    } catch (error) {
      next(error);
    }
  }

  public static async getTeamMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as any).user;
      const orgId = authUser?.orgId || (req.headers['x-org-id'] as string);
      const userId = authUser?.userId || (req.headers['x-user-id'] as string);
      const members = await AuthService.getTeamMembers(orgId, userId);
      ApiResponse.success(res, members, 'Team members fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async createTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as any).user || {};
      const member = await AuthService.createTeamMember(
        {
          userId: authUser.userId || (req.headers['x-user-id'] as string),
          orgId: authUser.orgId || (req.headers['x-org-id'] as string),
          firmName: authUser.firmName,
        },
        req.body
      );
      ApiResponse.created(res, member, 'Team member created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const updated = await AuthService.updateTeamMember(id, req.body);
      ApiResponse.success(res, updated, 'Team member updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await AuthService.deleteTeamMember(id);
      ApiResponse.success(res, null, 'Team member deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
