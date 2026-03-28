import { ConfigurationError } from '@/shared/errors/app-error';
import { envSchema, parseEnv } from '@/shared/config/env';

const base = {
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.net/mydb?retryWrites=true',
  STUB_USER_ID: 'stub-user',
};

describe('parseEnv', () => {
  it('accepts valid development env', () => {
    const result = parseEnv({
      NODE_ENV: 'development',
      ...base,
    });
    expect(result.NODE_ENV).toBe('development');
    expect(result.MONGODB_URI).toContain('mongodb');
    expect(result.STUB_USER_ID).toBe('stub-user');
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
        STUB_USER_ID: 'x',
      }),
    ).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError when MONGODB_URI is empty', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        MONGODB_URI: '',
        STUB_USER_ID: 'x',
      }),
    ).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError when STUB_USER_ID is missing', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://localhost/test',
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
