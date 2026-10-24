import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { OrganizationModel } from './organization.model';
import { UserModel } from './user.model';
import { RefreshSessionModel } from './session.model';
import { OtpVerificationModel } from './otp.model';
import { TrustedDeviceModel } from './trustedDevice.model';
import { JwtService } from './jwt.service';
import {
  IJwtUserPayload,
  IAuthTokens,
  IUserDocument,
  IDeviceCredential,
} from './auth.interface';
import { AppError } from '../../shared/utils/apiError';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { logger } from '../../config/logger';
import { AttendanceService } from '../attendance/attendance.service';
import { MailService } from '../../shared/utils/mailService';

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class AuthService {
  public static readonly DEFAULT_ADMIN_EMAIL = 'info.openstreem@gmail.com';
  public static readonly DEFAULT_ADMIN_PASSWORD_NUMERIC = '482916';

  /**
   * Seed/Ensure Admin Account with 6-digit numerical password
   */
  public static async ensureSeedData(): Promise<void> {
    try {
      const adminEmail = this.DEFAULT_ADMIN_EMAIL.toLowerCase().trim();
      const adminPasswordNumeric = this.DEFAULT_ADMIN_PASSWORD_NUMERIC;
      const passwordHash = await bcrypt.hash(adminPasswordNumeric, 10);

      let org = await OrganizationModel.findOne({ email: adminEmail });
      if (!org) {
        org = await OrganizationModel.findOne();
      }
      if (!org) {
        org = await OrganizationModel.create({
          name: 'Ayatrio Practice Management Firm',
          email: adminEmail,
          mobile: '4000000000',
          totalSeats: 999999,
          isActive: true,
        });
      }

      const existingAdmin = await UserModel.findOne({ email: adminEmail }).select('+passwordHash');
      if (!existingAdmin) {
        await UserModel.create({
          orgId: org._id,
          firmName: org.name,
          name: 'Ayatrio Admin',
          email: adminEmail,
          mobile: '4000000000',
          passwordHash,
          role: 'admin',
          initials: 'AY',
          status: 'active',
          tokenVersion: 0,
          isEmailVerified: true,
        });
        logger.info(`✅ Seeded Admin Account: ${adminEmail} with numerical password: ${adminPasswordNumeric}`);
      } else {
        // Only set seed password if no password has ever been set!
        // DO NOT overwrite if user or admin has set or updated their password
        let needsSave = false;
        if (!existingAdmin.passwordHash) {
          existingAdmin.passwordHash = passwordHash;
          needsSave = true;
        }
        if (existingAdmin.status !== 'active') {
          existingAdmin.status = 'active';
          needsSave = true;
        }
        if (!existingAdmin.orgId) {
          existingAdmin.orgId = org._id as any;
          needsSave = true;
        }
        if (needsSave) {
          await existingAdmin.save();
        }
      }
    } catch (err) {
      logger.error('Failed to ensure seed data:', err);
    }
  }

  /**
   * Authenticate user with Email and Password
   */
  public static async loginWithPassword(
    email: string,
    password: string,
    options?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    await this.ensureSeedData();

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw AppError.badRequest('Email is required');
    }
    if (!password) {
      throw AppError.badRequest('Password is required');
    }

    // 1. Check if user exists in DB
    const user = await UserModel.findOne({ email: cleanEmail })
      .select('+passwordHash +password')
      .populate('orgId', 'name isActive');

    if (!user) {
      const err = new AppError(
        'No account found with this email. Please check your email or create a new organization.',
        HTTP_STATUS.NOT_FOUND
      );
      (err as any).code = 'USER_NOT_FOUND';
      throw err;
    }

    // 2. Check user status
    const userStatusStr = String(user.status || 'active').toLowerCase();
    if (userStatusStr !== 'active') {
      throw new AppError(
        'Your account has been deactivated. Please contact your firm administrator.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 3. Compare password
    const submittedPassword = String(password).trim();
    let isMatch = false;

    if (user.passwordHash) {
      isMatch = await bcrypt.compare(submittedPassword, user.passwordHash);
    }

    // Backward compatibility: If raw password was stored in plain text or not yet hashed
    if (!isMatch && (user as any).password && (user as any).password === submittedPassword) {
      isMatch = true;
      user.passwordHash = await bcrypt.hash(submittedPassword, 10);
      (user as any).password = undefined;
      await user.save();
    }

    // Default fallback: If user was seeded without passwordHash, allow initial login with default '123456'
    if (!isMatch && !user.passwordHash && submittedPassword === '123456') {
      isMatch = true;
      user.passwordHash = await bcrypt.hash('123456', 10);
      await user.save();
    }

    if (!isMatch) {
      if (!user.passwordHash) {
        throw AppError.unauthorized('Password not set for this account. Please use default 123456 or contact your administrator.');
      }
      throw AppError.unauthorized('Incorrect password. Please verify and try again.');
    }

    // Ensure user has valid orgId
    if (!user.orgId) {
      let org = await OrganizationModel.findOne();
      if (!org) {
        org = await OrganizationModel.create({
          name: 'Ayatrio Practice',
          code: 'ayatrio-practice',
          totalSeats: 10,
          isActive: true,
        });
      }
      user.orgId = org._id as any;
      user.firmName = user.firmName || org.name;
    }

    user.lastLoginAt = new Date();
    await user.save();

    // 4. Persistence management: single active session per device (userAgent)
    if (options?.userAgent) {
      await RefreshSessionModel.deleteMany({ userId: user._id, userAgent: options.userAgent });
    }

    const session = await RefreshSessionModel.create({
      userId: user._id,
      orgId: (user.orgId as any)?._id || user.orgId,
      tokenHash: 'temp_hash',
      userAgent: options?.userAgent || '',
      ipAddress: options?.ipAddress || '',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    });

    const firmName = (user.orgId as any)?.name || user.firmName || 'Ayatrio Practice';
    const jwtPayload = this.buildJwtPayload(user, firmName);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(session._id));

    session.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await session.save();

    const userObj = user.toObject ? user.toObject() : (user as any);
    delete (userObj as any).passwordHash;

    return { user: userObj, tokens };
  }

  /**
   * Helper to build JWT payload from a User document
   */
  private static buildJwtPayload(user: IUserDocument, firmName: string): IJwtUserPayload {
    const resolvedOrgId = String((user.orgId as any)?._id || user.orgId || '');
    return {
      userId: String(user._id),
      orgId: resolvedOrgId,
      firmName: firmName || user.firmName || 'Firm',
      email: user.email,
      role: user.role,
      name: user.name,
      initials: user.initials || computeInitials(user.name),
      permissions: user.permissions,
      tokenVersion: user.tokenVersion || 0,
    };
  }

  /**
   * Register a new organization and admin user
   */
  public static async registerOrganization(data: {
    firmName: string;
    name: string;
    email: string;
    mobile: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    await this.ensureSeedData();

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanMobile = data.mobile.replace(/\D/g, '').slice(-10);

    if (!data.password || String(data.password).trim().length < 6) {
      throw AppError.badRequest('Password must be at least 6 characters');
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    });

    if (existingUser) {
      throw AppError.conflict('An account with this email or mobile number already exists');
    }

    // Create organization
    const org = await OrganizationModel.create({
      name: data.firmName.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      totalSeats: 5,
      isActive: true,
    });

    const passwordHash = await bcrypt.hash(String(data.password).trim(), 10);

    // Create admin user
    const user = await UserModel.create({
      orgId: org._id,
      firmName: org.name,
      name: data.name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      passwordHash,
      role: 'admin',
      initials: computeInitials(data.name),
      status: 'active',
      tokenVersion: 0,
      lastLoginAt: new Date(),
    });

    // Create session & tokens (60 days persistent)
    const session = await RefreshSessionModel.create({
      userId: user._id,
      orgId: org._id,
      tokenHash: 'temp_hash',
      userAgent: data.userAgent || '',
      ipAddress: data.ipAddress || '',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days persistent session
    });

    const jwtPayload = this.buildJwtPayload(user, org.name);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(session._id));

    session.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await session.save();

    const userObj = user.toObject ? user.toObject() : (user as any);
    delete (userObj as any).passwordHash;

    return { user: userObj, tokens };
  }

  /**
   * Look up if a user exists by email or mobile
   */
  public static async lookupUser(identifier: string, type: 'email' | 'mobile'): Promise<IUserDocument | null> {
    await this.ensureSeedData();

    if (type === 'email') {
      const cleanEmail = identifier.trim().toLowerCase();
      return UserModel.findOne({ email: cleanEmail }).populate('orgId', 'name');
    } else {
      const cleanMobile = identifier.replace(/\D/g, '').slice(-10);
      return UserModel.findOne({ mobile: cleanMobile }).populate('orgId', 'name');
    }
  }

  /**
   * Send an OTP code (email or mobile)
   */
  public static async sendOtp(
    target: string,
    type: 'email' | 'mobile',
    purpose: 'login' | 'signup' = 'login'
  ): Promise<{ success: boolean; message: string }> {
    await this.ensureSeedData();

    const cleanTarget = type === 'email' ? target.trim().toLowerCase() : target.replace(/\D/g, '').slice(-10);

    // Verify account existence based on purpose
    const existingUser = await UserModel.findOne(
      type === 'email' ? { email: cleanTarget } : { mobile: cleanTarget }
    ).select('name email status');

    if (purpose === 'signup') {
      if (existingUser) {
        throw AppError.conflict(
          type === 'email'
            ? 'An account with this email already exists. Please log in instead.'
            : 'An account with this mobile number already exists. Please log in instead.'
        );
      }
    } else {
      if (!existingUser) {
        throw AppError.notFound(
          type === 'email'
            ? 'No account found with this email. Please check your email or contact your administrator.'
            : 'No account found with this mobile number.'
        );
      }

      if (existingUser.status && String(existingUser.status).toLowerCase() !== 'active') {
        throw new AppError(
          'Your account has been deactivated. Please contact your firm administrator.',
          HTTP_STATUS.FORBIDDEN
        );
      }
    }

    // Generate real 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = JwtService.hashToken(otpCode);

    await OtpVerificationModel.deleteMany({ target: cleanTarget });
    await OtpVerificationModel.create({
      target: cleanTarget,
      codeHash,
      type: purpose,
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    if (type === 'email') {
      await MailService.sendOtpEmail(cleanTarget, otpCode, existingUser?.name || 'User');
    } else {
      logger.info(`📱 Generated OTP for ${cleanTarget}: ${otpCode}`);
    }

    return {
      success: true,
      message: `Verification code sent to ${target}`,
    };
  }

  /**
   * Verify OTP and log user in with tokens
   */
  public static async verifyOtp(
    target: string,
    code: string,
    options?: { userAgent?: string; ipAddress?: string; deviceId?: string; purpose?: string }
  ): Promise<{ user?: IUserDocument; tokens?: IAuthTokens; deviceCredential?: IDeviceCredential; verified?: boolean }> {
    await this.ensureSeedData();

    const isEmail = target.includes('@');
    const cleanEmail = isEmail ? target.trim().toLowerCase() : '';
    const cleanNum = !isEmail ? target.replace(/\D/g, '').slice(-10) : '';

    const codeHash = JwtService.hashToken(code);
    const record = await OtpVerificationModel.findOne({
      target: isEmail ? cleanEmail : cleanNum,
      codeHash,
    });

    if (!record) {
      throw AppError.badRequest('Invalid or expired OTP code');
    }

    // Delete single-use OTP record
    await OtpVerificationModel.deleteOne({ _id: record._id });

    // If purpose is signup, return verified status directly (user creation happens at register)
    if (options?.purpose === 'signup') {
      return { verified: true };
    }

    // Find the user
    const query = isEmail ? { email: cleanEmail } : { mobile: cleanNum };
    const user = await UserModel.findOne(query).populate('orgId', 'name');

    if (!user) {
      throw AppError.notFound('Account not found. Please contact your administrator.');
    }

    const userStatusStr = String(user.status || 'active').toLowerCase();
    if (userStatusStr !== 'active') {
      throw new AppError('Your account has been deactivated. Please contact your administrator.', HTTP_STATUS.FORBIDDEN);
    }

    if (!user.orgId) {
      let org = await OrganizationModel.findOne();
      if (!org) {
        org = await OrganizationModel.create({
          name: 'Ayatrio Practice',
          code: 'ayatrio-practice',
          totalSeats: 10,
          isActive: true,
        });
      }
      user.orgId = org._id as any;
      user.firmName = user.firmName || org.name;
    }

    user.lastLoginAt = new Date();
    user.isEmailVerified = true;
    await user.save();

    // Single active persistent session per device (userAgent)
    if (options?.userAgent) {
      await RefreshSessionModel.deleteMany({ userId: user._id, userAgent: options.userAgent });
    }

    // Create persistent session (60 days across browser restarts and day changes)
    const session = await RefreshSessionModel.create({
      userId: user._id,
      orgId: (user.orgId as any)?._id || user.orgId,
      tokenHash: 'temp_hash',
      userAgent: options?.userAgent || '',
      ipAddress: options?.ipAddress || '',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days persistent
    });

    const firmName = (user.orgId as any)?.name || user.firmName || 'Practice Firm';
    const jwtPayload = this.buildJwtPayload(user, firmName);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(session._id));

    session.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await session.save();

    // Cleanup OTP
    await OtpVerificationModel.deleteMany({ target: { $in: [cleanEmail, cleanNum] } });

    // Generate and persist cryptographically secure device credential
    const resolvedDeviceId = (options?.deviceId || `dev_${crypto.randomBytes(12).toString('hex')}`).trim();
    const deviceToken = crypto.randomBytes(32).toString('hex');
    const deviceTokenHash = JwtService.hashToken(deviceToken);
    const userEmail = (user.email || cleanEmail).toLowerCase();

    await TrustedDeviceModel.findOneAndUpdate(
      { email: userEmail, deviceId: resolvedDeviceId },
      {
        userId: user._id,
        email: userEmail,
        deviceId: resolvedDeviceId,
        tokenHash: deviceTokenHash,
        isVerified: true,
        verifiedAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        userAgent: options?.userAgent || '',
        ipAddress: options?.ipAddress || '',
      },
      { upsert: true, new: true }
    );

    const deviceCredential: IDeviceCredential = {
      email: userEmail,
      deviceId: resolvedDeviceId,
      deviceToken,
    };

    return { user, tokens, deviceCredential };
  }

  /**
   * Returning User Login: Authenticate using verified trusted device token without OTP
   */
  public static async loginWithDevice(
    email: string,
    deviceId: string,
    deviceToken: string,
    options?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: IUserDocument; tokens: IAuthTokens; deviceCredential: IDeviceCredential }> {
    await this.ensureSeedData();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !deviceId || !deviceToken) {
      throw AppError.badRequest('Email, device identifier, and device token are required');
    }

    const user = await UserModel.findOne({ email: cleanEmail }).populate('orgId', 'name');
    if (!user) {
      throw AppError.notFound('No account found with this email');
    }

    const userStatusStr = String(user.status || 'active').toLowerCase();
    if (userStatusStr !== 'active') {
      throw new AppError('Your account has been deactivated.', HTTP_STATUS.FORBIDDEN);
    }

    // Lookup trusted device record
    const trustedRecord = await TrustedDeviceModel.findOne({
      email: cleanEmail,
      deviceId: deviceId.trim(),
    });

    if (!trustedRecord || !trustedRecord.isVerified) {
      throw AppError.unauthorized('Device is not verified for this account. Please verify with OTP.');
    }

    if (trustedRecord.expiresAt && trustedRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Device verification has expired. Please verify with OTP again.');
    }

    // Verify token hash
    const incomingHash = JwtService.hashToken(deviceToken);
    if (trustedRecord.tokenHash !== incomingHash) {
      throw AppError.unauthorized('Invalid device credential. Please verify with OTP.');
    }

    // Rotate device token for continuous freshness and security
    const newDeviceToken = crypto.randomBytes(32).toString('hex');
    trustedRecord.tokenHash = JwtService.hashToken(newDeviceToken);
    trustedRecord.lastUsedAt = new Date();
    trustedRecord.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    if (options?.userAgent) trustedRecord.userAgent = options.userAgent;
    if (options?.ipAddress) trustedRecord.ipAddress = options.ipAddress;
    await trustedRecord.save();

    user.lastLoginAt = new Date();
    await user.save();

    // Create session (30-day persistent session across page refreshes and browser restarts)
    const session = await RefreshSessionModel.create({
      userId: user._id,
      orgId: (user.orgId as any)?._id || user.orgId,
      tokenHash: 'temp_hash',
      userAgent: options?.userAgent || '',
      ipAddress: options?.ipAddress || '',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const firmName = (user.orgId as any)?.name || user.firmName || 'Practice Firm';
    const jwtPayload = this.buildJwtPayload(user, firmName);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(session._id));

    session.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await session.save();

    return {
      user,
      tokens,
      deviceCredential: {
        email: cleanEmail,
        deviceId,
        deviceToken: newDeviceToken,
      },
    };
  }

  /**
   * Check if a device credential is valid and verified for an email
   */
  public static async checkDeviceStatus(
    email: string,
    deviceId: string,
    deviceToken?: string
  ): Promise<{ isVerified: boolean; user?: any }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !deviceId) {
      return { isVerified: false };
    }

    const user = await UserModel.findOne({ email: cleanEmail }).populate('orgId', 'name');
    if (!user) {
      return { isVerified: false };
    }

    const record = await TrustedDeviceModel.findOne({
      email: cleanEmail,
      deviceId: deviceId.trim(),
    });

    if (!record || !record.isVerified || (record.expiresAt && record.expiresAt < new Date())) {
      return { isVerified: false };
    }

    if (deviceToken) {
      const incomingHash = JwtService.hashToken(deviceToken);
      if (record.tokenHash !== incomingHash) {
        return { isVerified: false };
      }
    }

    return {
      isVerified: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        firmName: (user.orgId as any)?.name || user.firmName,
      },
    };
  }



  /**
   * Rotate Refresh Token & Issue new Access Token
   */
  public static async rotateRefreshToken(
    rawRefreshToken: string,
    options?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ accessToken: string; refreshToken: string; user: IUserDocument }> {
    let decoded: { userId: string; sessionId: string; tokenVersion: number };
    try {
      decoded = JwtService.verifyRefreshToken(rawRefreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const session = await RefreshSessionModel.findById(decoded.sessionId);
    if (!session) {
      throw AppError.unauthorized('Session not found or has expired');
    }

    // Token reuse detection! If already revoked, invalidate all sessions for this user!
    if (session.isRevoked) {
      await RefreshSessionModel.updateMany({ userId: decoded.userId }, { isRevoked: true });
      logger.warn(`🚨 Token reuse detected for user ${decoded.userId}. All sessions revoked!`);
      throw AppError.unauthorized('Compromised session detected. Please log in again.');
    }

    const currentHash = JwtService.hashToken(rawRefreshToken);
    if (session.tokenHash !== currentHash) {
      session.isRevoked = true;
      await session.save();
      throw AppError.unauthorized('Invalid refresh token signature');
    }

    const user = await UserModel.findById(decoded.userId).populate('orgId', 'name');
    const userStatusStr = String(user?.status || 'active').toLowerCase();
    if (!user || userStatusStr !== 'active' || user.tokenVersion !== decoded.tokenVersion) {
      session.isRevoked = true;
      await session.save();
      throw AppError.unauthorized('User not found, deactivated, or sessions invalidated');
    }

    // Invalidate current session and create new rotated session
    session.isRevoked = true;
    await session.save();

    const newSession = await RefreshSessionModel.create({
      userId: user._id,
      orgId: (user.orgId as any)?._id || user.orgId,
      tokenHash: 'temp_hash',
      userAgent: options?.userAgent || session.userAgent,
      ipAddress: options?.ipAddress || session.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const firmName = (user.orgId as any)?.name || user.firmName || 'Practice Firm';
    const jwtPayload = this.buildJwtPayload(user, firmName);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(newSession._id));

    newSession.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await newSession.save();

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  /**
   * Revoke current session (Logout) and automatically check out from office attendance
   */
  public static async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    let resolvedUserId = userId;

    if (rawRefreshToken) {
      try {
        const decoded = JwtService.verifyRefreshToken(rawRefreshToken);
        if (!resolvedUserId && decoded.userId) {
          resolvedUserId = decoded.userId;
        }
        await RefreshSessionModel.findByIdAndUpdate(decoded.sessionId, { isRevoked: true });
      } catch {
        // Ignore token decode errors on logout
      }
    }

    // Auto-checkout employee on logout if currently punched in without punch-out
    if (resolvedUserId) {
      try {
        await AttendanceService.autoCheckoutOnLogout(resolvedUserId);
      } catch (err) {
        logger.warn(`Failed to auto-checkout user on logout: ${err}`);
      }
    }
  }

  /**
   * Get current user profile by userId
   */
  public static async getCurrentUser(userId: string): Promise<IUserDocument> {
    const user = await UserModel.findById(userId).populate('orgId', 'name');
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user;
  }

  /**
   * Get team members belonging to the organization/firm
   */
  public static async getTeamMembers(orgId?: string, userId?: string | null): Promise<IUserDocument[]> {
    const filter: Record<string, any> = {};
    if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
      filter.orgId = new mongoose.Types.ObjectId(orgId);
    } else if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await UserModel.findById(userId).lean();
      if (user?.orgId) {
        filter.orgId = user.orgId;
      }
    }
    return UserModel.find(filter).sort({ createdAt: -1 });
  }

  /**
   * Create a new team member
   */
  public static async createTeamMember(
    adminUser: { userId?: string | null; orgId?: string | null; firmName?: string },
    data: {
      name: string;
      email: string;
      mobile: string;
      role?: string;
      department?: string;
      designation?: string;
      permissions?: any;
      password?: string;
    }
  ): Promise<IUserDocument> {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanMobile = data.mobile.replace(/\D/g, '').slice(-10);

    const exists = await UserModel.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    }).select('+passwordHash');

    if (exists) {
      // If user exists with this email, update details and set password
      if (exists.email.toLowerCase() === cleanEmail) {
        if (data.password && String(data.password).trim()) {
          exists.passwordHash = await bcrypt.hash(String(data.password).trim(), 10);
        } else if (!exists.passwordHash) {
          exists.passwordHash = await bcrypt.hash('123456', 10);
        }
        if (data.name) exists.name = data.name.trim();
        if (data.role) exists.role = (data.role || 'employee').toLowerCase() as any;
        if (data.department) exists.department = data.department;
        if (data.designation) exists.designation = data.designation;
        if (data.permissions) exists.permissions = data.permissions;
        exists.status = 'active';
        await exists.save();
        return exists;
      }
      throw AppError.conflict('A user with this mobile number already exists');
    }

    let resolvedOrgId = adminUser.orgId;
    if (!resolvedOrgId && adminUser.userId && mongoose.Types.ObjectId.isValid(adminUser.userId)) {
      const adminDoc = await UserModel.findById(adminUser.userId).lean();
      if (adminDoc?.orgId) {
        resolvedOrgId = String(adminDoc.orgId);
      }
    }

    if (!resolvedOrgId || !mongoose.Types.ObjectId.isValid(resolvedOrgId)) {
      const anyOrg = await OrganizationModel.findOne().lean();
      if (anyOrg) {
        resolvedOrgId = String(anyOrg._id);
      } else {
        const newOrg = await OrganizationModel.create({
          name: adminUser.firmName || 'Ayatrio Practice',
          totalSeats: 999999,
          isActive: true,
        });
        resolvedOrgId = String(newOrg._id);
      }
    }

    const initials = computeInitials(data.name);
    const rawPassword = data.password && String(data.password).trim() ? String(data.password).trim() : '123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await UserModel.create({
      orgId: new mongoose.Types.ObjectId(resolvedOrgId),
      firmName: adminUser.firmName || 'Ayatrio Practice',
      name: data.name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      passwordHash,
      role: (data.role || 'employee').toLowerCase() as any,
      department: data.department || 'Audit & Taxation',
      designation: data.designation || 'Staff',
      initials,
      permissions: data.permissions || {},
      status: 'active',
      tokenVersion: 0,
      isEmailVerified: true,
    });

    return user;
  }

  /**
   * Update team member
   */
  public static async updateTeamMember(id: string, updates: Partial<any>): Promise<IUserDocument> {
    const updateData: any = { ...updates };

    // 1. Password hashing
    if (updateData.password && String(updateData.password).trim()) {
      updateData.passwordHash = await bcrypt.hash(String(updateData.password).trim(), 10);
      delete updateData.password;
    } else {
      delete updateData.password;
    }

    // 2. Normalize fields
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    if (updateData.mobile) {
      updateData.mobile = updateData.mobile.replace(/\D/g, '').slice(-10);
    }
    if (updateData.role) {
      updateData.role = updateData.role.toLowerCase();
    }
    if (updateData.status && typeof updateData.status === 'string') {
      const s = updateData.status.toLowerCase();
      if (s === 'deactivated' || s === 'resigned' || s === 'suspended') {
        updateData.status = 'suspended';
      } else {
        updateData.status = 'active';
      }
    }

    let user: IUserDocument | null = null;

    // Try finding by ObjectId if id is valid Mongo ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await UserModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    }

    // Fallback: Try finding by email
    const emailToMatch = (updateData.email || (id && id.includes('@') ? id : '')).toLowerCase().trim();
    if (!user && emailToMatch) {
      user = await UserModel.findOneAndUpdate({ email: emailToMatch }, { $set: updateData }, { new: true });
    }

    // Fallback: If not in MongoDB yet, create the user record
    if (!user && emailToMatch) {
      let org = await OrganizationModel.findOne();
      const rawPassword = updateData.passwordHash ? null : '123456';
      const hash = updateData.passwordHash || (await bcrypt.hash(rawPassword!, 10));
      delete updateData.passwordHash;

      user = await UserModel.create({
        orgId: org?._id,
        firmName: org?.name || 'Ayatrio Practice',
        name: updateData.name || emailToMatch.split('@')[0],
        email: emailToMatch,
        mobile: updateData.mobile || '9999999999',
        passwordHash: hash,
        role: (updateData.role || 'employee').toLowerCase(),
        department: updateData.department || 'Audit & Taxation',
        designation: updateData.designation || 'Staff',
        status: updateData.status || 'active',
        permissions: updateData.permissions || {},
        isEmailVerified: true,
      });
    }

    if (!user) {
      throw AppError.notFound('Team member not found');
    }

    return user;
  }

  /**
   * Delete team member permanently from DB by ObjectId or email
   */
  public static async deleteTeamMember(id: string, email?: string): Promise<void> {
    if (mongoose.Types.ObjectId.isValid(id)) {
      await UserModel.findByIdAndDelete(id);
      return;
    }
    const emailToMatch = (email || (id && id.includes('@') ? id : '')).toLowerCase().trim();
    if (emailToMatch) {
      await UserModel.findOneAndDelete({ email: emailToMatch });
    }
  }

  /**
   * Get organization details (address, bank details, GSTIN, PAN, LUT, etc.)
   */
  public static async getOrganization(orgId?: string): Promise<any> {
    let org: any = null;
    if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
      org = await OrganizationModel.findById(orgId).lean();
    }
    if (!org) {
      org = await OrganizationModel.findOne().lean();
    }

    if (!org) {
      // Auto-provision initial organization
      const createdOrg = await OrganizationModel.create({
        name: 'Ayatrio Practice Management Firm',
        email: 'contact@ayatrio.com',
        mobile: '9876543210',
        pan: 'AAACA0000A',
        gstin: '27AAACA0000A1Z5',
        website: 'https://ayatrio.com',
        lutNumber: 'AD270324000123M',
        lutDisabled: false,
        address: 'Unit 402, Signature Tower, Bandra Kurla Complex',
        addressDetails: {
          addressLine1: 'Unit 402, Signature Tower',
          addressLine2: 'Bandra Kurla Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '400051',
          country: 'India',
          landmark: 'Near Diamond Bourse',
        },
        paymentDetails: {
          bankDetails: {
            bankName: 'HDFC Bank Ltd.',
            accountNumber: '50200012345678',
            accountHolderName: 'AYATRIO PRACTICE MANAGEMENT FIRM',
            ifscCode: 'HDFC0000060',
            branchName: 'BKC Branch, Mumbai',
            accountType: 'Current',
            upiId: 'ayatrio@hdfcbank',
            qrCodeUrl: '',
          },
          paymentMode: 'Bank Transfer',
          currency: 'INR',
          terms: 'Payment due within 15 days of invoice date. 18% p.a. interest applicable after due date.',
          isDefault: true,
        },
        totalSeats: 999999,
        isActive: true,
      });
      return createdOrg.toJSON();
    }

    // Ensure fallback fields exist if saved without them in older DB documents
    const orgObj = { ...org, id: String(org._id) };
    if (!orgObj.addressDetails || !orgObj.addressDetails.state) {
      orgObj.addressDetails = {
        addressLine1: orgObj.address || '',
        addressLine2: '',
        city: '',
        state: '',
        stateCode: '',
        pincode: '',
        country: '',
        landmark: '',
        ...(orgObj.addressDetails || {}),
      };
    }
    if (!orgObj.paymentDetails || !orgObj.paymentDetails.bankDetails?.bankName) {
      orgObj.paymentDetails = {
        bankDetails: {
          bankName: 'Not Added',
          accountNumber: 'Not Added',
          accountHolderName: orgObj.name || 'Not Added',
          ifscCode: 'Not Added',
          branchName: 'Not Added',
          accountType: 'N/A',
          upiId: 'N/A',
          qrCodeUrl: '',
          ...(orgObj.paymentDetails?.bankDetails || {}),
        },
        paymentMode: orgObj.paymentDetails?.paymentMode || 'Not Added',
        currency: orgObj.paymentDetails?.currency || 'N/A',
        terms: orgObj.paymentDetails?.terms || 'Not Added',
        isDefault: true,
      };
    }
    if (!orgObj.gstin) orgObj.gstin = '';
    if (!orgObj.pan) orgObj.pan = '';
    if (!orgObj.lutNumber) orgObj.lutNumber = '';

    return orgObj;
  }

  /**
   * Update organization details
   */
  public static async updateOrganization(orgId: string, updates: Record<string, any>): Promise<any> {
    let org = null;
    if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
      org = await OrganizationModel.findByIdAndUpdate(orgId, { $set: updates }, { new: true });
    }
    if (!org) {
      const anyOrg = await OrganizationModel.findOne();
      if (anyOrg) {
        org = await OrganizationModel.findByIdAndUpdate(anyOrg._id, { $set: updates }, { new: true });
      }
    }
    if (!org) {
      org = await OrganizationModel.create(updates);
    }
    return org;
  }
}
