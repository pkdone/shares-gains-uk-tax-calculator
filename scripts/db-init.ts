import { config } from 'dotenv';
import { resolve } from 'path';

import { logError, logInfo, logScriptEnd } from '../src/shared/app-logger';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FALLBACK_JEST_URI = 'mongodb://127.0.0.1:27017/jest-fallback';

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === FALLBACK_JEST_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and set your MongoDB Atlas URI.',
    );
  }

  const { createConnectedMongoClient } = await import('../src/infrastructure/persistence/mongodb-client');
  const { initMongoDatabase, MANAGED_COLLECTION_NAMES } = await import(
    '../src/infrastructure/persistence/ensure-collections'
  );
  const {
    COLLECTION_ACQUISITIONS,
    COLLECTION_DISPOSALS,
    COLLECTION_FX_RATES,
    COLLECTION_HOLDINGS,
    COLLECTION_USERS,
  } = await import('../src/infrastructure/persistence/schema-registry');

  const client = await createConnectedMongoClient();
  try {
    const db = client.db();
    logInfo('db:init — provisioning MongoDB');
    logInfo(`  Database: ${db.databaseName}`);
    logInfo('  Collections (create if missing, else collMod; each with $jsonSchema validator):');
    for (const name of MANAGED_COLLECTION_NAMES) {
      logInfo(`    - ${name}`);
    }
    logInfo('  Indexes (createIndex, idempotent):');
    logInfo(`    - ${COLLECTION_USERS}: unique on { userId: 1 }`);
    logInfo(`    - ${COLLECTION_HOLDINGS}: unique on { userId: 1, symbol: 1 }`);
    logInfo(`    - ${COLLECTION_ACQUISITIONS}: { holdingId: 1, userId: 1 }`);
    logInfo(
      `    - ${COLLECTION_ACQUISITIONS}: unique partial { holdingId: 1, userId: 1, symbol: 1, grantNumber: 1, vestPeriod: 1 } (import_usd with grant/vest)`,
    );
    logInfo(`    - ${COLLECTION_DISPOSALS}: { holdingId: 1, userId: 1 }`);
    logInfo(
      `    - ${COLLECTION_DISPOSALS}: unique partial { holdingId: 1, userId: 1, importSourceFingerprint: 1 } (PDF import)`,
    );
    logInfo(`    - ${COLLECTION_FX_RATES}: unique on { date: 1 }`);
    logInfo('  Applying…');
    await initMongoDatabase(db);
    logInfo('db:init — done.');
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
