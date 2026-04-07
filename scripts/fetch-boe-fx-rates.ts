import { logInfo, logScriptEnd } from '../src/shared/app-logger';

import { assertMongoUriForScripts, loadScriptEnv } from './lib/script-env';
import { reportScriptFailure } from './lib/script-main';

loadScriptEnv();

async function main(): Promise<void> {
  assertMongoUriForScripts();

  const { createConnectedMongoClient, disconnectMongoClient } = await import(
    '../src/infrastructure/persistence/mongodb-client'
  );
  const { COLLECTION_FX_RATES } = await import('../src/infrastructure/persistence/schema-registry');
  const { fetchBoeXudlusRates } = await import('../src/infrastructure/fx/boe-fx-client');
  const { fxRateRepository } = await import('../src/infrastructure/repositories/composition-root');

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

  await fxRateRepository.upsertMany(rates);
  logInfo('fetch:fx-rates — upserted into fx_rates collection');
  logScriptEnd();

  await disconnectMongoClient();
}

void main().catch(reportScriptFailure);
