import type { Db } from 'mongodb';

import {
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_FX_RATES,
  COLLECTION_HOLDINGS,
  COLLECTION_USERS,
  getJsonSchemaForCollection,
} from '@/infrastructure/persistence/schema-registry';

/** Collections provisioned by `initMongoDatabase` / `npm run db:init`. */
export const MANAGED_COLLECTION_NAMES = [
  COLLECTION_USERS,
  COLLECTION_HOLDINGS,
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_FX_RATES,
] as const;

export type ManagedCollectionName = (typeof MANAGED_COLLECTION_NAMES)[number];

/**
 * Idempotent: creates collections with validators, applies `collMod`, creates indexes.
 * Use from `scripts/db-init.ts` or integration test setup — not from `getMongoClient()`.
 */
export async function initMongoDatabase(db: Db): Promise<void> {
  for (const name of MANAGED_COLLECTION_NAMES) {
    const $jsonSchema = getJsonSchemaForCollection(name);
    const cols = await db.listCollections({ name }).toArray();
    if (cols.length === 0) {
      await db.createCollection(name, {
        validator: { $jsonSchema },
        validationLevel: 'strict',
        validationAction: 'error',
      });
    } else {
      await db.command({
        collMod: name,
        validator: { $jsonSchema },
        validationLevel: 'strict',
        validationAction: 'error',
      });
    }
  }

  await db.collection(COLLECTION_USERS).createIndex({ userId: 1 }, { unique: true });

  await db.collection(COLLECTION_HOLDINGS).createIndex({ userId: 1, symbol: 1 }, { unique: true });

  await db.collection(COLLECTION_ACQUISITIONS).createIndex({ holdingId: 1, userId: 1 });
  await db.collection(COLLECTION_ACQUISITIONS).createIndex(
    { holdingId: 1, userId: 1, symbol: 1, grantNumber: 1, vestPeriod: 1 },
    {
      unique: true,
      name: 'acquisitions_import_usd_symbol_grant_vest',
      partialFilterExpression: {
        economicsKind: 'import_usd',
        grantNumber: { $exists: true, $type: 'string' },
        vestPeriod: { $exists: true, $type: 'string' },
      },
    },
  );
  await db.collection(COLLECTION_DISPOSALS).createIndex({ holdingId: 1, userId: 1 });
  await db.collection(COLLECTION_FX_RATES).createIndex({ date: 1 }, { unique: true });
}
