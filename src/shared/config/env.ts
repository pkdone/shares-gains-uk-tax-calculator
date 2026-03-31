import { z } from 'zod';

import { ConfigurationError } from '@/shared/errors/app-error';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  /** Public origin of the app (e.g. https://example.com). */
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  /**
   * Browser-visible base URL of the Better Auth API (must match BETTER_AUTH_URL; include `/api/auth`).
   * Example: http://localhost:3000/api/auth
   */
  NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url('NEXT_PUBLIC_BETTER_AUTH_URL must be a valid URL'),
  /**
   * Base URL of the Better Auth HTTP API (must include `/api/auth`).
   * Example: http://localhost:3000/api/auth
   */
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  /** Secret for session signing and verification tokens. Use a long random string in production. */
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  /** `noop` logs only; reserve `smtp` for a future provider. */
  AUTH_EMAIL_PROVIDER: z.enum(['noop', 'smtp']).default('noop'),
});

export type Env = z.infer<typeof envSchema>;

export { envSchema };

/** Inputs for {@link parseEnv}; string values only — Zod applies defaults and enums. */
export type EnvParseInput = {
  NODE_ENV?: string;
  MONGODB_URI?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_BETTER_AUTH_URL?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  AUTH_EMAIL_PROVIDER?: string;
};

/**
 * Validates environment variables. Use in tests with a custom `source` object.
 */
export function parseEnv(source: EnvParseInput): Env {
  const result = envSchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    MONGODB_URI: source.MONGODB_URI,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: source.NEXT_PUBLIC_BETTER_AUTH_URL,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    AUTH_EMAIL_PROVIDER: source.AUTH_EMAIL_PROVIDER,
  });

  if (!result.success) {
    const detail = result.error.flatten().fieldErrors;
    throw new ConfigurationError(`Invalid environment: ${JSON.stringify(detail)}`);
  }

  const data = result.data;
  if (data.BETTER_AUTH_URL !== data.NEXT_PUBLIC_BETTER_AUTH_URL) {
    throw new ConfigurationError(
      'BETTER_AUTH_URL and NEXT_PUBLIC_BETTER_AUTH_URL must be identical (full URL including /api/auth).',
    );
  }

  return data;
}

export const env = parseEnv(process.env);
