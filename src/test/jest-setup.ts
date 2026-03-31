import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/jest-fallback';
}

const devOrigin = 'http://localhost:3000';
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = devOrigin;
}
if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = `${devOrigin}/api/auth`;
}
if (!process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL = `${devOrigin}/api/auth`;
}
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = 'jest-test-secret-at-least-32-chars-long!!';
}
if (!process.env.AUTH_EMAIL_PROVIDER) {
  process.env.AUTH_EMAIL_PROVIDER = 'noop';
}
