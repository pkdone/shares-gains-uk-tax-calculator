import { ObjectId, type WithId } from 'mongodb';

import type {
  CreateShareAcquisition,
  ShareAcquisitionRepository,
  UpsertImportUsdBatchResult,
} from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisition, ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { AcquisitionDocument } from '@/infrastructure/persistence/schemas/acquisition-record';
import { COLLECTION_ACQUISITIONS } from '@/infrastructure/persistence/schema-registry';
import { PersistenceError } from '@/shared/errors/app-error';

type AcquisitionDoc = WithId<AcquisitionDocument>;

function mapOptionalGrantVest(doc: AcquisitionDoc): {
  grantNumber?: string | null;
  vestPeriod?: string | null;
} {
  const out: { grantNumber?: string | null; vestPeriod?: string | null } = {};
  if ('grantNumber' in doc) {
    out.grantNumber = doc.grantNumber;
  }
  if ('vestPeriod' in doc) {
    out.vestPeriod = doc.vestPeriod;
  }
  return out;
}

function mapDoc(doc: AcquisitionDoc): ShareAcquisition {
  const base = {
    id: doc._id.toHexString(),
    portfolioId: doc.portfolioId.toHexString(),
    userId: doc.userId,
    symbol: doc.symbol,
    eventDate: doc.eventDate,
    quantity: doc.quantity,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...mapOptionalGrantVest(doc),
  };

  if (doc.economicsKind === 'manual_usd') {
    return {
      ...base,
      economicsKind: 'manual_usd',
      considerationUsd: doc.considerationUsd,
      feesUsd: doc.feesUsd,
    };
  }

  return {
    ...base,
    economicsKind: 'import_usd',
    considerationUsd: doc.considerationUsd,
    feesUsd: doc.feesUsd,
    ...(doc.grossVestedQuantity !== undefined && doc.sharesTradedForTaxes !== undefined
      ? {
          grossVestedQuantity: doc.grossVestedQuantity,
          sharesTradedForTaxes: doc.sharesTradedForTaxes,
        }
      : {}),
  };
}

function optionalGrantVestFields(
  input: CreateShareAcquisition,
): { grantNumber?: string | null; vestPeriod?: string | null } {
  return {
    ...(input.grantNumber === undefined ? {} : { grantNumber: input.grantNumber }),
    ...(input.vestPeriod === undefined ? {} : { vestPeriod: input.vestPeriod }),
  };
}

function toInsertDoc(input: CreateShareAcquisition, _id: ObjectId, now: Date): AcquisitionDoc {
  const portfolioId = new ObjectId(input.portfolioId);
  const base = {
    _id,
    portfolioId,
    userId: input.userId,
    symbol: input.symbol,
    eventDate: input.eventDate,
    quantity: input.quantity,
    createdAt: now,
    updatedAt: now,
    ...optionalGrantVestFields(input),
  };

  if (input.economicsKind === 'manual_usd') {
    return {
      ...base,
      economicsKind: 'manual_usd',
      considerationUsd: input.considerationUsd,
      feesUsd: input.feesUsd,
    };
  }

  return {
    ...base,
    economicsKind: 'import_usd',
    ...(input.grossVestedQuantity === undefined ? {} : { grossVestedQuantity: input.grossVestedQuantity }),
    ...(input.sharesTradedForTaxes === undefined ? {} : { sharesTradedForTaxes: input.sharesTradedForTaxes }),
    considerationUsd: input.considerationUsd,
    feesUsd: input.feesUsd,
  };
}

export class MongoShareAcquisitionRepository implements ShareAcquisitionRepository {
  async insert(input: CreateShareAcquisition): Promise<ShareAcquisition> {
    if (!ObjectId.isValid(input.portfolioId)) {
      throw new PersistenceError('Invalid portfolio id');
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<AcquisitionDoc>(COLLECTION_ACQUISITIONS);
      const _id = new ObjectId();
      const now = new Date();
      const doc = toInsertDoc(input, _id, now);
      await coll.insertOne(doc);
      return mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to record acquisition', { cause: err });
    }
  }

  async insertMany(inputs: readonly CreateShareAcquisition[]): Promise<ShareAcquisition[]> {
    if (inputs.length === 0) {
      return [];
    }

    const portfolioId = inputs[0]?.portfolioId;
    if (portfolioId === undefined || !ObjectId.isValid(portfolioId)) {
      throw new PersistenceError('Invalid portfolio id');
    }

    for (const row of inputs) {
      if (row.portfolioId !== portfolioId) {
        throw new PersistenceError('Bulk insert requires a single portfolio');
      }
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<AcquisitionDoc>(COLLECTION_ACQUISITIONS);
      const now = new Date();
      const docs: AcquisitionDoc[] = inputs.map((input) => {
        const _id = new ObjectId();
        return toInsertDoc(input, _id, now);
      });
      await coll.insertMany(docs);
      return docs.map(mapDoc);
    } catch (err) {
      throw new PersistenceError('Failed to record acquisitions', { cause: err });
    }
  }

  async upsertImportUsdBatch(
    portfolioId: string,
    userId: string,
    drafts: readonly ShareAcquisitionImportUsd[],
  ): Promise<UpsertImportUsdBatchResult> {
    if (!ObjectId.isValid(portfolioId)) {
      throw new PersistenceError('Invalid portfolio id');
    }

    if (drafts.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const portfolioOid = new ObjectId(portfolioId);
    let inserted = 0;
    let updated = 0;

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<AcquisitionDoc>(COLLECTION_ACQUISITIONS);

      for (const d of drafts) {
        const hasUpsertKey =
          d.grantNumber !== undefined &&
          d.grantNumber !== null &&
          d.grantNumber.length > 0 &&
          d.vestPeriod !== undefined &&
          d.vestPeriod !== null &&
          d.vestPeriod.length > 0;

        const now = new Date();

        if (hasUpsertKey) {
          const filter = {
            portfolioId: portfolioOid,
            userId,
            economicsKind: 'import_usd' as const,
            symbol: d.symbol,
            grantNumber: d.grantNumber,
            vestPeriod: d.vestPeriod,
          };
          const res = await coll.updateOne(
            filter,
            {
              $set: {
                eventDate: d.eventDate,
                quantity: d.quantity,
                grossVestedQuantity: d.grossVestedQuantity,
                sharesTradedForTaxes: d.sharesTradedForTaxes,
                considerationUsd: d.considerationUsd,
                feesUsd: d.feesUsd,
                updatedAt: now,
              },
              $setOnInsert: {
                createdAt: now,
              },
            },
            { upsert: true },
          );
          if (res.upsertedCount === 1) {
            inserted += 1;
          } else if (res.matchedCount >= 1) {
            updated += 1;
          }
        } else {
          const _id = new ObjectId();
          const doc = toInsertDoc(
            {
              ...d,
              portfolioId,
              userId,
            },
            _id,
            now,
          );
          await coll.insertOne(doc);
          inserted += 1;
        }
      }

      return { inserted, updated };
    } catch (err) {
      throw new PersistenceError('Failed to upsert import acquisitions', { cause: err });
    }
  }

  async listByPortfolioForUser(
    portfolioId: string,
    userId: string,
  ): Promise<ShareAcquisition[]> {
    if (!ObjectId.isValid(portfolioId)) {
      return [];
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<AcquisitionDoc>(COLLECTION_ACQUISITIONS);
      const cursor = coll
        .find({
          portfolioId: new ObjectId(portfolioId),
          userId,
        })
        .sort({ eventDate: 1, _id: 1 });
      const docs = await cursor.toArray();
      return docs.map(mapDoc);
    } catch (err) {
      throw new PersistenceError('Failed to list acquisitions', { cause: err });
    }
  }

  async deleteByIdForPortfolioUser(
    portfolioId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    if (!ObjectId.isValid(portfolioId) || !ObjectId.isValid(id)) {
      return false;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<AcquisitionDoc>(COLLECTION_ACQUISITIONS);
      const res = await coll.deleteOne({
        _id: new ObjectId(id),
        portfolioId: new ObjectId(portfolioId),
        userId,
      });
      return res.deletedCount === 1;
    } catch (err) {
      throw new PersistenceError('Failed to delete acquisition', { cause: err });
    }
  }
}
