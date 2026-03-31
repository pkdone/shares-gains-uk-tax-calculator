import { ConfigurationError } from '@/shared/errors/app-error';
import { envSchema, parseEnv } from '@/shared/config/env';

const base = {
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.net/mydb?retryWrites=true',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_BETTER_AUTH_URL: 'http://localhost:3000/api/auth',
  BETTER_AUTH_URL: 'http://localhost:3000/api/auth',
  BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
  AUTH_EMAIL_PROVIDER: 'noop' as const,
};

describe('parseEnv', () => {
  it('accepts valid development env', () => {
    const result = parseEnv({
      NODE_ENV: 'development',
      ...base,
    });
    expect(result.NODE_ENV).toBe('development');
    expect(result.MONGODB_URI).toContain('mongodb');
    expect(result.BETTER_AUTH_URL).toContain('/api/auth');
  });

  it('defaults NODE_ENV to development when omitted', () => {
    const result = parseEnv({
      ...base,
    });
    expect(result.NODE_ENV).toBe('development');
  });

  it('throws ConfigurationError when MONGODB_URI is missing', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        NEXT_PUBLIC_APP_URL: base.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_BETTER_AUTH_URL: base.NEXT_PUBLIC_BETTER_AUTH_URL,
        BETTER_AUTH_URL: base.BETTER_AUTH_URL,
        BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET,
        AUTH_EMAIL_PROVIDER: base.AUTH_EMAIL_PROVIDER,
      }),
    ).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError when MONGODB_URI is empty', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        ...base,
        MONGODB_URI: '',
      }),
    ).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError when BETTER_AUTH_URL and NEXT_PUBLIC_BETTER_AUTH_URL differ', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        ...base,
        BETTER_AUTH_URL: 'http://localhost:3000/api/auth',
        NEXT_PUBLIC_BETTER_AUTH_URL: 'http://127.0.0.1:3000/api/auth',
      }),
    ).toThrow(ConfigurationError);
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'invalid',
        ...base,
      }),
    ).toThrow(ConfigurationError);
  });
});

describe('envSchema', () => {
  it('parses production', () => {
    const parsed = envSchema.parse({
      NODE_ENV: 'production',
      ...base,
    });
    expect(parsed.NODE_ENV).toBe('production');
  });
});
