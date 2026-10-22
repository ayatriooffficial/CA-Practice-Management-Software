import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Resolve the backend env file from this module so startup does not depend on cwd.
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const envSchema = z.object({
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
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Environment validation failed:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
