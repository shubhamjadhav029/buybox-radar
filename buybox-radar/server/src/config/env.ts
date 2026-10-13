import { z } from 'zod';

// Load .env in Node 20 if available
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // ignore if .env file does not exist
  }
}

// Config is parsed from process.env at boot; fail fast on missing required vars
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(600),
  CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).default(100),
  WEB_DIST_DIR: z.string().default(''),
  SEED_FILE: z.string().default('./prisma/seed-data/companies.json'),
  SEED_ON_BOOT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  LIVE_PROVIDER: z.enum(['none', 'google']).default('none'),
  GOOGLE_PLACES_API_KEY: z.string().default(''),
});

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  const errors = result.error.flatten().fieldErrors;
  const msg = Object.entries(errors)
    .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${msg}`);
}

export const env = result.data;
export type Env = typeof env;
