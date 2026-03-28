import { config } from 'dotenv';
import { resolve } from 'path';

import { logError, logInfo, logScriptEnd } from '../src/shared/app-logger';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FALLBACK_JEST_URI = 'mongodb://127.0.0.1:27017/jest-fallback';

/**
 * Drops managed application collections. Requires explicit opt-in to reduce accidental production use.
 */
async function main(): Promise<void> {
  if (process.env.ALLOW_DB_TEARDOWN !== '1') {
    throw new Error(
      'Refusing to run: set ALLOW_DB_TEARDOWN=1 to drop managed collections (development / reset only).',
    );
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === FALLBACK_JEST_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and set your MongoDB Atlas URI.',
    );
  }

  const { createConnectedMongoClient } = await import('../src/infrastructure/persistence/mongodb-client');
  const { MANAGED_COLLECTION_NAMES } = await import('../src/infrastructure/persistence/ensure-collections');

  const client = await createConnectedMongoClient();
  try {
    const db = client.db();
    /** Drop dependent data first (no FK enforcement, but logical order). */
    const dropOrder = [...MANAGED_COLLECTION_NAMES].reverse();
    logInfo('db:teardown — dropping managed collections');
    logInfo(`  Database: ${db.databaseName}`);
    logInfo('  Planned drop order:');
    for (const name of dropOrder) {
      logInfo(`    - ${name}`);
    }
    for (const name of dropOrder) {
      try {
        await db.collection(name).drop();
        logInfo(`  Dropped: ${name}`);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: number }).code : undefined;
        if (code === 26) {
          logInfo(`  Skipped (not found): ${name}`);
          continue;
        }
        throw err;
      }
    }
    logInfo('db:teardown — done.');
    logScriptEnd();
  } finally {
    await client.close();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logError(message);
  logScriptEnd();
  process.exitCode = 1;
});
