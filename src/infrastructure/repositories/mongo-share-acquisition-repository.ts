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
  return {
    id: doc._id.toHexString(),
    portfolioId: doc.portfolioId.toHexString(),
    userId: doc.userId,
    symbol: doc.symbol,
    eventDate: doc.eventDate,
    quantity: doc.quantity,
    grossConsiderationGbp: doc.grossConsiderationGbp,
    feesGbp: doc.feesGbp,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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
      const doc: AcquisitionDoc = {
        _id,
        portfolioId: new ObjectId(input.portfolioId),
        userId: input.userId,
        symbol: input.symbol,
        eventDate: input.eventDate,
        quantity: input.quantity,
        grossConsiderationGbp: input.grossConsiderationGbp,
        feesGbp: input.feesGbp,
        createdAt: now,
        updatedAt: now,
      };
      await coll.insertOne(doc);
      return mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to record acquisition', { cause: err });
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
