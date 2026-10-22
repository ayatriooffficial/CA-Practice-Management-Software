import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { IJwtUserPayload, IAuthTokens } from './auth.interface';

export class JwtService {
  /**
   * Hashes a sensitive string (token, OTP) using SHA-256 for secure DB comparison
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sign an access token (default 15 minutes)
   */
  public static signAccessToken(payload: IJwtUserPayload): string {
    const options: SignOptions = {
      expiresIn: (env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  /**
   * Sign a refresh token (default 7 days)
   */
  public static signRefreshToken(payload: { userId: string; sessionId: string; tokenVersion: number }): string {
    const options: SignOptions = {
      expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  }

  /**
   * Verify an access token
   */
  public static verifyAccessToken(token: string): IJwtUserPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as IJwtUserPayload;
  }

  /**
   * Verify a refresh token
   */
  public static verifyRefreshToken(token: string): { userId: string; sessionId: string; tokenVersion: number } {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; sessionId: string; tokenVersion: number };
  }

  /**
   * Generate both access and refresh tokens
   */
  public static generateAuthTokens(
    payload: IJwtUserPayload,
    sessionId: string
  ): IAuthTokens {
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken({
      userId: payload.userId,
      sessionId,
      tokenVersion: payload.tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 mins in seconds
    };
  }
}
