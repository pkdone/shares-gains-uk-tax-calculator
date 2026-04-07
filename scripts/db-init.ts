import { logInfo, logScriptEnd } from '../src/shared/app-logger';

import { assertMongoUriForScripts, loadScriptEnv } from './lib/script-env';
import { reportScriptFailure } from './lib/script-main';

loadScriptEnv();

async function main(): Promise<void> {
  assertMongoUriForScripts();

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

void main().catch(reportScriptFailure);
