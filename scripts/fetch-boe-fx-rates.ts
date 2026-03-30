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

  const { createConnectedMongoClient, disconnectMongoClient } = await import(
    '../src/infrastructure/persistence/mongodb-client'
  );
  const { COLLECTION_FX_RATES } = await import('../src/infrastructure/persistence/schema-registry');
  const { fetchBoeXudlusRates } = await import('../src/infrastructure/fx/boe-fx-client');
  const { MongoFxRateRepository } = await import('../src/infrastructure/repositories/mongo-fx-rate-repository');

  const from = new Date(Date.UTC(2016, 0, 1));
  const to = new Date();

  const checkClient = await createConnectedMongoClient();
  try {
    const db = checkClient.db();
    const existing = await db.listCollections({ name: COLLECTION_FX_RATES }).toArray();
    if (existing.length === 0) {
      throw new Error('The fx_rates collection does not exist. Run `npm run db:init` first.');
    }
  } finally {
    await checkClient.close();
  }

  logInfo('fetch:fx-rates — downloading Bank of England XUDLUSS (USD per 1 GBP)');
  logInfo(`  Date range (UTC): ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`);

  const rates = await fetchBoeXudlusRates({ from, to });
  logInfo(`  Parsed ${rates.length} daily rates`);

  const repo = new MongoFxRateRepository();
  await repo.upsertMany(rates);
  logInfo('fetch:fx-rates — upserted into fx_rates collection');
  logScriptEnd();

  await disconnectMongoClient();
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logError(message);
  logScriptEnd();
  process.exitCode = 1;
});
