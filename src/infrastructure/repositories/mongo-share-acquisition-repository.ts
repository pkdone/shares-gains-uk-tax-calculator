import { ObjectId, type WithId } from 'mongodb';

import type {
  CreateShareAcquisition,
  ShareAcquisitionRepository,
} from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { AcquisitionDocument } from '@/infrastructure/persistence/schemas/acquisition-record';
import { COLLECTION_ACQUISITIONS } from '@/infrastructure/persistence/schema-registry';
import { PersistenceError } from '@/shared/errors/app-error';

type AcquisitionDoc = WithId<AcquisitionDocument>;

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
  };

  if (doc.economicsKind === 'manual_gbp') {
    return {
      ...base,
      economicsKind: 'manual_gbp',
      grossConsiderationGbp: doc.grossConsiderationGbp,
      feesGbp: doc.feesGbp,
    };
  }

  return {
    ...base,
    economicsKind: 'import_usd',
    grossConsiderationUsd: doc.grossConsiderationUsd,
    feesUsd: doc.feesUsd,
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
  };

  if (input.economicsKind === 'manual_gbp') {
    return {
      ...base,
      economicsKind: 'manual_gbp',
      grossConsiderationGbp: input.grossConsiderationGbp,
      feesGbp: input.feesGbp,
    };
  }

  return {
    ...base,
    economicsKind: 'import_usd',
    grossConsiderationUsd: input.grossConsiderationUsd,
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
}
