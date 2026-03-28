import { AppError } from '@/shared/errors/app-error';
import { envSchema, parseEnv } from '@/shared/config/env';

describe('parseEnv', () => {
  it('accepts valid development env', () => {
    const result = parseEnv({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.net/mydb?retryWrites=true',
    });
    expect(result.NODE_ENV).toBe('development');
    expect(result.MONGODB_URI).toContain('mongodb');
  });

  it('defaults NODE_ENV to development when omitted', () => {
    const result = parseEnv({
      MONGODB_URI: 'mongodb://localhost/test',
    });
    expect(result.NODE_ENV).toBe('development');
  });

  it('throws AppError when MONGODB_URI is missing', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
      }),
    ).toThrow(AppError);
  });

  it('throws AppError when MONGODB_URI is empty', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        MONGODB_URI: '',
      }),
    ).toThrow(AppError);
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'invalid',
        MONGODB_URI: 'mongodb://localhost/test',
      }),
    ).toThrow(AppError);
  });
});

describe('envSchema', () => {
  it('parses production', () => {
    const parsed = envSchema.parse({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost/test',
    });
    expect(parsed.NODE_ENV).toBe('production');
  });
});
