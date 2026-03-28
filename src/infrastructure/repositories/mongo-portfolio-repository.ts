import { MongoServerError, ObjectId, type WithId } from 'mongodb';

import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { Portfolio, PortfolioCreate } from '@/domain/schemas/portfolio';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { PortfolioDocument } from '@/infrastructure/persistence/schemas/portfolio-record';
import {
  COLLECTION_PORTFOLIOS,
} from '@/infrastructure/persistence/schema-registry';
import { DomainError, PersistenceError } from '@/shared/errors/app-error';

function mapDoc(doc: WithId<PortfolioDocument>): Portfolio {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoPortfolioRepository implements PortfolioRepository {
  async create(input: PortfolioCreate): Promise<Portfolio> {
    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<PortfolioDocument>>(COLLECTION_PORTFOLIOS);
      const _id = new ObjectId();
      const now = new Date();
      const doc: WithId<PortfolioDocument> = {
        _id,
        userId: input.userId,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      await coll.insertOne(doc);
      return mapDoc(doc);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new DomainError(
          'You already have a portfolio with this name. Choose a different name.',
          { cause: err },
        );
      }
      throw new PersistenceError('Failed to create portfolio', { cause: err });
    }
  }

  async findByIdForUser(portfolioId: string, userId: string): Promise<Portfolio | null> {
    if (!ObjectId.isValid(portfolioId)) {
      return null;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<PortfolioDocument>>(COLLECTION_PORTFOLIOS);
      const doc = await coll.findOne({ _id: new ObjectId(portfolioId), userId });
      return doc === null ? null : mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to load portfolio', { cause: err });
    }
  }

  async listByUser(userId: string): Promise<Portfolio[]> {
    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<PortfolioDocument>>(COLLECTION_PORTFOLIOS);
      const cursor = coll.find({ userId }).sort({ updatedAt: -1 });
      const docs = await cursor.toArray();
      return docs.map(mapDoc);
    } catch (err) {
      throw new PersistenceError('Failed to list portfolios', { cause: err });
    }
  }
}
