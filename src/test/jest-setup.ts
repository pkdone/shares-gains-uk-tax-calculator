import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/jest-fallback';
}
