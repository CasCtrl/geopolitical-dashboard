import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const envSchema = z
  .object({
    SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(5001),
    APP_VERSION: z.string().default('1.1'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DB_SERVER: z.string().default('localhost'),
    DB_DATABASE: z.string().default('geopolitical_dashboard'),
    DB_USER: z.string().default('sa'),
    DB_PASSWORD: z.string().min(1).default('YourPassword123!'),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(1433),
    DB_CONNECT_STRICT: z.coerce.boolean().default(false),
    DB_INIT_ENABLED: z.coerce.boolean().default(true),

    AUTH_REQUIRED: z.coerce.boolean().default(false),
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
    OBS_MIN_REQUESTS: z.coerce.number().int().min(1).max(100000).default(20),
    OBS_ERROR_RATE_THRESHOLD_PCT: z.coerce.number().min(0).max(100).default(5),
    OBS_P95_LATENCY_THRESHOLD_MS: z.coerce.number().min(1).max(60000).default(800),
  })
  .superRefine((env, ctx) => {
    const insecureDefaultPassword = 'YourPassword123!';

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