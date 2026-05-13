import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const envSchema = z
  .object({
    SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(5050),
    APP_VERSION: z.string().default('1.1'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DB_SERVER: z.string().default('localhost'),
    DB_DATABASE: z.string().default('geopolitical_dashboard'),
    DB_USER: z.string().default('sa'),
    DB_PASSWORD: z.string().min(1).optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(1433),
    DB_CONNECT_STRICT: envBoolean.default(false),
    DB_INIT_ENABLED: envBoolean.default(true),

    AUTH_REQUIRED: envBoolean.default(false),
    API_TOKEN: z.string().optional(),
    ADMIN_ROLE: z.string().default('admin'),
    ALLOWED_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003'),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(5000).default(300),
    EXPENSIVE_READ_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
    EXPENSIVE_READ_MAX: z.coerce.number().int().min(1).max(1000).default(30),
    EXPENSIVE_WRITE_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(900000),
    EXPENSIVE_WRITE_MAX: z.coerce.number().int().min(1).max(1000).default(20),
    ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
    ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(60),
    AUDIT_TRAIL_MAX_ENTRIES: z.coerce.number().int().min(10).max(20000).default(1000),
    AUDIT_SINK_ENABLED: envBoolean.default(true),
    AUDIT_SINK_DIR: z.string().default(path.join(homedir(), '.geopolitical-dashboard', 'audit')),
    AUDIT_SINK_MAX_FILES: z.coerce.number().int().min(1).max(3650).default(14),
    OBS_MIN_REQUESTS: z.coerce.number().int().min(1).max(100000).default(20),
    OBS_ERROR_RATE_THRESHOLD_PCT: z.coerce.number().min(0).max(100).default(5),
    OBS_P95_LATENCY_THRESHOLD_MS: z.coerce.number().min(1).max(60000).default(800),
    OBS_DB_HEALTH_MIN_PCT: z.coerce.number().min(0).max(100).default(99),
    OBS_NEWS_INGESTION_MIN_SUCCESS_PCT: z.coerce.number().min(0).max(100).default(95),
    OBS_FRONTEND_CRASH_MAX_PER_1K: z.coerce.number().min(0).max(1000).default(2),
    INCIDENT_MAX_ENTRIES: z.coerce.number().int().min(10).max(100000).default(500),
    INCIDENT_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
    INTEGRATION_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
    BLOOMBERG_PORTFOLIO_API_URL: z.string().url().optional().or(z.literal('')),
    BLOOMBERG_API_TOKEN: z.string().optional(),
    PORTFOLIO_INTEGRATION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(10000),
    PIPELINE_SOURCE_URLS: z.string().default(''),
    PIPELINE_SOURCE_AUTH_TOKEN: z.string().optional(),
    PRIVACY_POLICY_URL: z.string().url().optional().or(z.literal('')),
    TERMS_OF_USE_URL: z.string().url().optional().or(z.literal('')),
    DATA_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(90),
  })
  .superRefine((env, ctx) => {
    const insecureDefaultPassword = 'YourPassword123!';
    const needsDatabaseSecret = env.NODE_ENV === 'production' || env.DB_CONNECT_STRICT || env.DB_INIT_ENABLED;

    if (needsDatabaseSecret && !env.DB_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DB_PASSWORD is required when DB access is enabled or strict mode is on',
        path: ['DB_PASSWORD'],
      });
    }

    if (env.AUTH_REQUIRED && !env.API_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API_TOKEN is required when AUTH_REQUIRED=true',
        path: ['API_TOKEN'],
      });
    }

    if (env.NODE_ENV === 'production' && env.DB_PASSWORD === insecureDefaultPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DB_PASSWORD must be overridden in production',
        path: ['DB_PASSWORD'],
      });
    }

    if (env.NODE_ENV === 'production' && env.API_TOKEN === 'change-me') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API_TOKEN must not use the placeholder value in production',
        path: ['API_TOKEN'],
      });
    }

    if (env.NODE_ENV === 'production' && !env.AUTH_REQUIRED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AUTH_REQUIRED must be true in production',
        path: ['AUTH_REQUIRED'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid server environment configuration: ${details}`);
}

const env = parsed.data;

export default env;