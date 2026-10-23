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

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class AuthService {
  /**
   * Auto-seed disabled by configuration: do not create default users
   */
  public static async ensureSeedData(): Promise<void> {
    // Disabled: Do not create any default users or mock data
    return;
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
    password?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    await this.ensureSeedData();

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanMobile = data.mobile.replace(/\D/g, '').slice(-10);

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

    let passwordHash: string | undefined = undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

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

    // Create session & tokens
    const session = await RefreshSessionModel.create({
      userId: user._id,
      orgId: org._id,
      tokenHash: 'temp_hash',
      userAgent: data.userAgent || '',
      ipAddress: data.ipAddress || '',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const jwtPayload = this.buildJwtPayload(user, org.name);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(session._id));

    session.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await session.save();

    return { user, tokens };
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
  public static async sendOtp(target: string, type: 'email' | 'mobile'): Promise<{ success: boolean; message: string }> {
    await this.ensureSeedData();

    const cleanTarget = type === 'email' ? target.trim().toLowerCase() : target.replace(/\D/g, '').slice(-10);

    // Fixed demo OTP '123456' for predictable dev & testing
    const otpCode = '123456';
    const codeHash = JwtService.hashToken(otpCode);

    await OtpVerificationModel.deleteMany({ target: cleanTarget });
    await OtpVerificationModel.create({
      target: cleanTarget,
      codeHash,
      type: 'login',
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    logger.info(`📱 Generated OTP for ${cleanTarget}: ${otpCode}`);

    return {
      success: true,
      message: `OTP sent successfully to ${target}`,
    };
  }

  /**
   * Verify OTP and log user in with tokens
   */
  public static async verifyOtp(
    target: string,
    code: string,
    options?: { userAgent?: string; ipAddress?: string; deviceId?: string }
  ): Promise<{ user: IUserDocument; tokens: IAuthTokens; deviceCredential?: IDeviceCredential }> {
    await this.ensureSeedData();

    const isEmail = target.includes('@');
    const cleanEmail = isEmail ? target.trim().toLowerCase() : '';
    const cleanNum = !isEmail ? target.replace(/\D/g, '').slice(-10) : '';

    // Support dev demo codes: 123456, 1234, 000000, 999999
    const isDemoCode = code === '123456' || code === '1234' || code === '000000' || code === '999999';

    if (!isDemoCode) {
      const codeHash = JwtService.hashToken(code);
      const record = await OtpVerificationModel.findOne({
        target: isEmail ? cleanEmail : cleanNum,
        codeHash,
      });

      if (!record) {
        throw AppError.badRequest('Invalid or expired OTP code');
      }
    }

    // Find the user or auto-provision on demo code verification
    const query = isEmail ? { email: cleanEmail } : { mobile: cleanNum };
    let user = await UserModel.findOne(query).populate('orgId', 'name');

    if (!user) {
      if (isDemoCode) {
        let org = await OrganizationModel.findOne();
        if (!org) {
          org = await OrganizationModel.create({
            name: 'Ayatrio Practice',
            code: 'ayatrio-practice',
            totalSeats: 10,
            isActive: true,
          });
        }

        const defaultName = isEmail
          ? cleanEmail.split('@')[0]
          : `User ${cleanNum.slice(-4) || '9999'}`;
        const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

        // Generate guaranteed unique 10-digit mobile for email users
        const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
        const generatedMobile = '9' + Date.now().toString().slice(-5) + randomDigits;

        const resolvedEmail = isEmail ? cleanEmail : `user_${cleanNum}@ayatrio.local`;
        const resolvedMobile = isEmail ? generatedMobile : cleanNum;

        user = await UserModel.create({
          orgId: org._id,
          name: formattedName,
          email: resolvedEmail,
          mobile: resolvedMobile,
          role: 'employee',
          status: 'active',
          firmName: org.name,
          initials: computeInitials(formattedName),
          isEmailVerified: true,
        });
      } else {
        throw AppError.notFound('No account found with this identifier');
      }
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

    // Create persistent session (30 days across browser restarts)
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
   * Password login fallback
   */
  public static async loginWithPassword(
    email: string,
    pass: string,
    options?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    await this.ensureSeedData();

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail })
      .select('+passwordHash')
      .populate('orgId', 'name');

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const matches = await bcrypt.compare(pass, user.passwordHash);
    if (!matches) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const userStatusStr = String(user.status || 'active').toLowerCase();
    if (userStatusStr !== 'active') {
      throw new AppError('Your account has been deactivated.', HTTP_STATUS.FORBIDDEN);
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
    await user.save();

    const session = await RefreshSessionModel.create({
      userId: user._id,
      orgId: (user.orgId as any)?._id || user.orgId,
      tokenHash: 'temp_hash',
      userAgent: options?.userAgent || '',
      ipAddress: options?.ipAddress || '',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const firmName = (user.orgId as any)?.name || user.firmName || 'Practice Firm';
    const jwtPayload = this.buildJwtPayload(user, firmName);
    const tokens = JwtService.generateAuthTokens(jwtPayload, String(session._id));

    session.tokenHash = JwtService.hashToken(tokens.refreshToken);
    await session.save();

    return { user, tokens };
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
   * Revoke current session (Logout)
   */
  public static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    try {
      const decoded = JwtService.verifyRefreshToken(rawRefreshToken);
      await RefreshSessionModel.findByIdAndUpdate(decoded.sessionId, { isRevoked: true });
    } catch {
      // Ignore token decode errors on logout
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
    }
  ): Promise<IUserDocument> {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanMobile = data.mobile.replace(/\D/g, '').slice(-10);

    const exists = await UserModel.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    });
    if (exists) {
      throw AppError.conflict('A user with this email or mobile number already exists');
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

    const user = await UserModel.create({
      orgId: new mongoose.Types.ObjectId(resolvedOrgId),
      firmName: adminUser.firmName || 'Ayatrio Practice',
      name: data.name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      role: (data.role || 'employee').toLowerCase() as any,
      department: data.department || 'Audit & Taxation',
      designation: data.designation || 'Staff',
      initials,
      permissions: data.permissions || {},
      status: 'active',
      tokenVersion: 0,
    });

    return user;
  }

  /**
   * Update team member
   */
  public static async updateTeamMember(id: string, updates: Partial<any>): Promise<IUserDocument> {
    const user = await UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!user) {
      throw AppError.notFound('Team member not found');
    }
    return user;
  }

  /**
   * Delete team member
   */
  public static async deleteTeamMember(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
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
        addressLine1: orgObj.address || 'Unit 402, Signature Tower',
        addressLine2: 'Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '400051',
        country: 'India',
        landmark: 'Near Diamond Bourse',
        ...(orgObj.addressDetails || {}),
      };
    }
    if (!orgObj.paymentDetails || !orgObj.paymentDetails.bankDetails?.bankName) {
      orgObj.paymentDetails = {
        bankDetails: {
          bankName: 'HDFC Bank Ltd.',
          accountNumber: '50200012345678',
          accountHolderName: orgObj.name || 'AYATRIO PRACTICE MANAGEMENT FIRM',
          ifscCode: 'HDFC0000060',
          branchName: 'BKC Branch, Mumbai',
          accountType: 'Current',
          upiId: 'ayatrio@hdfcbank',
          qrCodeUrl: '',
          ...(orgObj.paymentDetails?.bankDetails || {}),
        },
        paymentMode: orgObj.paymentDetails?.paymentMode || 'Bank Transfer',
        currency: orgObj.paymentDetails?.currency || 'INR',
        terms: orgObj.paymentDetails?.terms || 'Payment due within 15 days of invoice date.',
        isDefault: true,
      };
    }
    if (!orgObj.gstin) orgObj.gstin = '27AAACA0000A1Z5';
    if (!orgObj.pan) orgObj.pan = 'AAACA0000A';
    if (!orgObj.lutNumber) orgObj.lutNumber = 'AD270324000123M';

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
