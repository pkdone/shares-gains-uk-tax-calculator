import { MongoServerError } from 'mongodb';

import { logInfo, logScriptEnd } from '../src/shared/app-logger';

import { assertMongoUriForScripts, loadScriptEnv } from './lib/script-env';
import { reportScriptFailure } from './lib/script-main';

loadScriptEnv();

/**
 * Drops managed application collections and Better Auth collections in the same database.
 * Requires explicit opt-in to reduce accidental production use.
 */
async function main(): Promise<void> {
  if (process.env.ALLOW_DB_TEARDOWN !== '1') {
    throw new Error(
      'Refusing to run: set ALLOW_DB_TEARDOWN=1 to drop managed collections (development / reset only).',
    );
  }

  assertMongoUriForScripts();

  const { createConnectedMongoClient } = await import('../src/infrastructure/persistence/mongodb-client');
  const { BETTER_AUTH_COLLECTION_NAMES, MANAGED_COLLECTION_NAMES } = await import(
    '../src/infrastructure/persistence/collection-names'
  );

  const client = await createConnectedMongoClient();
  try {
    const db = client.db();
    /** Drop dependent data first (no FK enforcement, but logical order). */
    const appDropOrder = MANAGED_COLLECTION_NAMES.toReversed();
    /** Session/account before user; verification and rateLimit are independent. */
    const authDropOrder = [...BETTER_AUTH_COLLECTION_NAMES];
    const dropOrder = [...appDropOrder, ...authDropOrder];

    logInfo('db:teardown — dropping managed collections (app + Better Auth)');
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
        if (err instanceof MongoServerError && err.code === 26) {
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

void main().catch(reportScriptFailure);
