import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Resolve the backend env file from this module so startup does not depend on cwd.
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Strict boolean parser for environment variables.
 * - 'true' -> true
 * - 'false' -> false
 * - boolean true/false -> true/false
 * - undefined, null, or empty string -> defaultValue
 * - any other value -> triggers a validation error (rejects invalid values rather than silently coercing)
 */
export const strictBoolean = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val, ctx) => {
      if (val === undefined || val === null || val === '') {
        return defaultValue;
      }
      if (typeof val === 'boolean') {
        return val;
      }
      const trimmed = val.trim().toLowerCase();
      if (trimmed === 'true') {
        return true;
      }
      if (trimmed === 'false') {
        return false;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid boolean environment variable: expected "true" or "false", received "${val}"`,
      });
      return z.NEVER;
    });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(500),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  // Google Drive & Uploads
  GOOGLE_DRIVE_CREDENTIALS_PATH: z.string().optional(),
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_ID: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_DRIVE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: z.string().default('root'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  UPLOAD_DIR: z.string().default('uploads'),
  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().default('ayatrio_dev_access_secret_key_change_in_production_2026'),
  JWT_REFRESH_SECRET: z.string().default('ayatrio_dev_refresh_secret_key_change_in_production_2026'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  // Email / SMTP (Free Gmail SMTP or Custom Provider)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: strictBoolean(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('CA Practice Management <no-reply@capractice.com>'),
  // Google OAuth 2.0 & Practice Email Integration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTHORIZED_PRACTICE_EMAIL: z.string().default('searchaicloud@gmail.com'),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  // Automatic Expiry Reminders (DSC & License)
  AUTOMATIC_EXPIRY_REMINDERS_ENABLED: strictBoolean(false),
  AUTOMATIC_REMINDERS_REAL_SEND: strictBoolean(false),
  AGENT_SCHEDULER_INTERVAL_MS: z.coerce.number().default(60000),
  ENABLE_BACKGROUND_SCHEDULER: strictBoolean(true),
  // PDF Signer
  PDF_SIGNER_PROVIDER: z.enum(['software', 'token']).default('software'),
  PDF_SIGNER_PFX_PATH: z.string().default('./certs/dev-signer.pfx'),
  PDF_SIGNER_PFX_PASSPHRASE: z.string().default('AyatrioTestPass123!'),
  PDF_SIGNER_STORAGE_DIR: z.string().default('./storage/pdf-signer'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Environment validation failed:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
