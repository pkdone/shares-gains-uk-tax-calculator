import { ObjectId, type WithId } from 'mongodb';

import type {
  CreateShareDisposal,
  ShareDisposalRepository,
} from '@/domain/repositories/share-disposal-repository';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { DisposalDocument } from '@/infrastructure/persistence/schemas/disposal-record';
import { COLLECTION_DISPOSALS } from '@/infrastructure/persistence/schema-registry';
import { PersistenceError } from '@/shared/errors/app-error';

type DisposalDoc = WithId<DisposalDocument>;

function mapDoc(doc: DisposalDoc): ShareDisposal {
  return {
    id: doc._id.toHexString(),
    portfolioId: doc.portfolioId.toHexString(),
    userId: doc.userId,
    symbol: doc.symbol,
    eventDate: doc.eventDate,
    quantity: doc.quantity,
    grossProceedsGbp: doc.grossProceedsGbp,
    feesGbp: doc.feesGbp,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoShareDisposalRepository implements ShareDisposalRepository {
  async insert(input: CreateShareDisposal): Promise<ShareDisposal> {
    if (!ObjectId.isValid(input.portfolioId)) {
      throw new PersistenceError('Invalid portfolio id');
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const _id = new ObjectId();
      const now = new Date();
      const doc: DisposalDoc = {
        _id,
        portfolioId: new ObjectId(input.portfolioId),
        userId: input.userId,
        symbol: input.symbol,
        eventDate: input.eventDate,
        quantity: input.quantity,
        grossProceedsGbp: input.grossProceedsGbp,
        feesGbp: input.feesGbp,
        createdAt: now,
        updatedAt: now,
      };
      await coll.insertOne(doc);
      return mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to record disposal', { cause: err });
    }
  }

  async listByPortfolioForUser(
    portfolioId: string,
    userId: string,
  ): Promise<ShareDisposal[]> {
    if (!ObjectId.isValid(portfolioId)) {
      return [];
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const cursor = coll
        .find({
          portfolioId: new ObjectId(portfolioId),
          userId,
        })
        .sort({ eventDate: 1, _id: 1 });
      const docs = await cursor.toArray();
      return docs.map(mapDoc);
    } catch (err) {
      throw new PersistenceError('Failed to list disposals', { cause: err });
    }
  }
}
