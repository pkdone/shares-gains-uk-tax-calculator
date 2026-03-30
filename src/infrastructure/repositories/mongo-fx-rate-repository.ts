import { ObjectId, type WithId } from 'mongodb';

import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { FxRate } from '@/domain/schemas/fx-rate';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { FxRateDocument } from '@/infrastructure/persistence/schemas/fx-rate-record';
import { COLLECTION_FX_RATES } from '@/infrastructure/persistence/schema-registry';
import { PersistenceError } from '@/shared/errors/app-error';

type FxRateDoc = WithId<FxRateDocument>;

function mapDoc(doc: FxRateDoc): FxRate {
  return {
    date: doc.date,
    usdPerGbp: doc.usdPerGbp,
  };
}

export class MongoFxRateRepository implements FxRateRepository {
  async findByDate(date: string): Promise<FxRate | null> {
    try {
      const client = await getMongoClient();
      const coll = client.db().collection<FxRateDoc>(COLLECTION_FX_RATES);
      const doc = await coll.findOne({ date });
      return doc === null ? null : mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to look up FX rate by date', { cause: err });
    }
  }

  async findLatestOnOrBefore(onOrBefore: string): Promise<FxRate | null> {
    try {
      const client = await getMongoClient();
      const coll = client.db().collection<FxRateDoc>(COLLECTION_FX_RATES);
      const doc = await coll.findOne(
        { date: { $lte: onOrBefore } },
        { sort: { date: -1 } },
      );
      return doc === null ? null : mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to look up FX rate on or before date', { cause: err });
    }
  }

  async upsertMany(rates: readonly FxRate[]): Promise<void> {
    if (rates.length === 0) {
      return;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<FxRateDoc>(COLLECTION_FX_RATES);
      const now = new Date();
      await coll.bulkWrite(
        rates.map((r) => ({
          updateOne: {
            filter: { date: r.date },
            update: {
              $set: {
                date: r.date,
                usdPerGbp: r.usdPerGbp,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: new ObjectId(),
                createdAt: now,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    } catch (err) {
      throw new PersistenceError('Failed to upsert FX rates', { cause: err });
    }
  }
}
