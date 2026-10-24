import { z } from 'zod';

export const registerOrgSchema = z.object({
  firmName: z.string().min(2, 'Firm name must be at least 2 characters'),
  name: z.string().min(2, 'Contact person name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  mobile: z.string().min(10, 'Valid 10-digit mobile number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const sendOtpSchema = z.object({
  target: z.string().min(3, 'Target email or mobile number is required'),
  type: z.enum(['email', 'mobile']).default('email'),
  purpose: z.enum(['login', 'signup']).optional().default('login'),
});

export const verifyOtpSchema = z.object({
  target: z.string().min(3, 'Target email or mobile is required'),
  code: z.string().min(4, 'OTP code is required'),
  type: z.enum(['email', 'mobile']).optional(),
  deviceId: z.string().optional(),
  purpose: z.enum(['login', 'signup']).optional().default('login'),
});

export const deviceLoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  deviceId: z.string().min(1, 'Device identifier is required'),
  deviceToken: z.string().min(1, 'Device token is required'),
});

export const deviceStatusSchema = z.object({
  email: z.string().email('Valid email address is required'),
  deviceId: z.string().min(1, 'Device identifier is required'),
  deviceToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const lookupUserSchema = z.object({
  identifier: z.string().min(3, 'Identifier is required'),
  type: z.enum(['email', 'mobile']).default('email'),
});
