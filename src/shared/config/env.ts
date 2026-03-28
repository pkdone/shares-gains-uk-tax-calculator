import { z } from 'zod';

import { AppError } from '@/shared/errors/app-error';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
});

export type Env = z.infer<typeof envSchema>;

export { envSchema };

/**
 * Validates environment variables. Use in tests with a custom `source` object.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    MONGODB_URI: source.MONGODB_URI,
  });

  if (!result.success) {
    const detail = result.error.flatten().fieldErrors;
    throw new AppError(`Invalid environment: ${JSON.stringify(detail)}`, 'CONFIG_INVALID');
  }

  return result.data;
}

export const env = parseEnv(process.env);
