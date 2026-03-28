import { z } from 'zod';

import { ConfigurationError } from '@/shared/errors/app-error';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  /** Stub tenant until authentication (ADR-007). Must match seeded user. */
  STUB_USER_ID: z.string().min(1, 'STUB_USER_ID is required'),
});

export type Env = z.infer<typeof envSchema>;

export { envSchema };

/** Inputs for {@link parseEnv}; string values only — Zod applies defaults and enums. */
export type EnvParseInput = {
  NODE_ENV?: string;
  MONGODB_URI?: string;
  STUB_USER_ID?: string;
};

/**
 * Validates environment variables. Use in tests with a custom `source` object.
 */
export function parseEnv(source: EnvParseInput): Env {
  const result = envSchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    MONGODB_URI: source.MONGODB_URI,
    STUB_USER_ID: source.STUB_USER_ID,
  });

  if (!result.success) {
    const detail = result.error.flatten().fieldErrors;
    throw new ConfigurationError(`Invalid environment: ${JSON.stringify(detail)}`);
  }

  return result.data;
}

export const env = parseEnv(process.env);
