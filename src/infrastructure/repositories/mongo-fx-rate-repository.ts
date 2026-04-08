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

  async findLatestOnOrBeforeForDates(onOrBeforeDates: readonly string[]): Promise<
    ReadonlyMap<string, FxRate | null>
  > {
    const out = new Map<string, FxRate | null>();
    if (onOrBeforeDates.length === 0) {
      return out;
    }

    const uniqueSorted = [...new Set(onOrBeforeDates)].toSorted((a, b) => a.localeCompare(b));
    const maxDate = uniqueSorted.at(-1);
    if (maxDate === undefined) {
      return out;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<FxRateDoc>(COLLECTION_FX_RATES);
      const rows = await coll
        .find({ date: { $lte: maxDate } })
        .sort({ date: 1 })
        .toArray();
      const rates = rows.map(mapDoc);

      let j = 0;
      let current: FxRate | null = null;
      for (const d of uniqueSorted) {
        while (j < rates.length) {
          const row = rates[j];
          if (row === undefined || row.date > d) {
            break;
          }
          current = row;
          j += 1;
        }
        out.set(d, current);
      }

      return out;
    } catch (err) {
      throw new PersistenceError('Failed to batch look up FX rates on or before dates', { cause: err });
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
