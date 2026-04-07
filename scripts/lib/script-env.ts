import { config } from 'dotenv';
import { resolve } from 'path';

/** Jest and local tooling may set this placeholder; scripts that need a real Atlas URI must refuse it. */
export const FALLBACK_JEST_URI = 'mongodb://127.0.0.1:27017/jest-fallback';

export function loadScriptEnv(): void {
  config({ path: resolve(process.cwd(), '.env.local') });
  config({ path: resolve(process.cwd(), '.env') });
}

export function assertMongoUriForScripts(): void {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === FALLBACK_JEST_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and set your MongoDB Atlas URI.',
    );
  }
}
