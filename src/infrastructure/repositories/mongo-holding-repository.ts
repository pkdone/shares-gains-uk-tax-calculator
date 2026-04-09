import { MongoServerError, ObjectId, type WithId } from 'mongodb';

import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { RepositoryWriteOptions } from '@/domain/repositories/repository-write-options';
import type { Holding, HoldingCreate } from '@/domain/schemas/holding';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import { mongoSessionForWrites } from '@/infrastructure/persistence/mongo-write-session';
import type { HoldingDocument } from '@/infrastructure/persistence/schemas/holding-record';
import { COLLECTION_HOLDINGS } from '@/infrastructure/persistence/schema-registry';
import { DomainError } from '@/domain/errors/domain-error';
import { PersistenceError } from '@/shared/errors/app-error';

function mapDoc(doc: WithId<HoldingDocument>): Holding {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    symbol: doc.symbol,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoHoldingRepository implements HoldingRepository {
  async create(input: HoldingCreate): Promise<Holding> {
    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<HoldingDocument>>(COLLECTION_HOLDINGS);
      const _id = new ObjectId();
      const now = new Date();
      const doc: WithId<HoldingDocument> = {
        _id,
        userId: input.userId,
        symbol: input.symbol,
        createdAt: now,
        updatedAt: now,
      };
      await coll.insertOne(doc);
      return mapDoc(doc);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new DomainError('You already have a holding for this symbol.', { cause: err });
      }
      throw new PersistenceError('Failed to create holding', { cause: err });
    }
  }

  async findByIdForUser(holdingId: string, userId: string): Promise<Holding | null> {
    if (!ObjectId.isValid(holdingId)) {
      return null;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<HoldingDocument>>(COLLECTION_HOLDINGS);
      const doc = await coll.findOne({ _id: new ObjectId(holdingId), userId });
      return doc === null ? null : mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to load holding', { cause: err });
    }
  }

  async listByUser(userId: string): Promise<Holding[]> {
    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<HoldingDocument>>(COLLECTION_HOLDINGS);
      const cursor = coll.find({ userId }).sort({ updatedAt: -1 });
      const docs = await cursor.toArray();
      return docs.map(mapDoc);
    } catch (err) {
      throw new PersistenceError('Failed to list holdings', { cause: err });
    }
  }

  async deleteByIdForUser(
    holdingId: string,
    userId: string,
    options?: RepositoryWriteOptions,
  ): Promise<boolean> {
    if (!ObjectId.isValid(holdingId)) {
      return false;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<HoldingDocument>>(COLLECTION_HOLDINGS);
      const res = await coll.deleteOne(
        { _id: new ObjectId(holdingId), userId },
        mongoSessionForWrites(options),
      );
      return res.deletedCount === 1;
    } catch (err) {
      throw new PersistenceError('Failed to delete holding', { cause: err });
    }
  }
}
