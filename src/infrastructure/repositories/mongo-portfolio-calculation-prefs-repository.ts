import { MongoServerError, ObjectId, type WithId } from 'mongodb';

import type { PortfolioCalculationPrefsRepository } from '@/domain/repositories/portfolio-calculation-prefs-repository';
import type {
  PortfolioCalculationPrefs,
  PortfolioCalculationPrefsUpsert,
} from '@/domain/schemas/portfolio-calculation-prefs';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { PortfolioCalculationPrefsDocument } from '@/infrastructure/persistence/schemas/portfolio-calculation-prefs-record';
import { COLLECTION_PORTFOLIO_CALCULATION_PREFS } from '@/infrastructure/persistence/schema-registry';
import { PersistenceError } from '@/shared/errors/app-error';

type PrefsMongoDoc = Omit<PortfolioCalculationPrefsDocument, 'portfolioId'> & {
  readonly portfolioId: ObjectId;
};

function mapDoc(doc: WithId<PrefsMongoDoc>): PortfolioCalculationPrefs {
  return {
    id: doc._id.toHexString(),
    portfolioId: doc.portfolioId.toHexString(),
    userId: doc.userId,
    broughtForwardLossesGbp: doc.broughtForwardLossesGbp,
    registeredForSelfAssessment: doc.registeredForSelfAssessment,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoPortfolioCalculationPrefsRepository implements PortfolioCalculationPrefsRepository {
  async findByPortfolioForUser(
    portfolioId: string,
    userId: string,
  ): Promise<PortfolioCalculationPrefs | null> {
    if (!ObjectId.isValid(portfolioId)) {
      return null;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<PrefsMongoDoc>>(COLLECTION_PORTFOLIO_CALCULATION_PREFS);
      const doc = await coll.findOne({
        portfolioId: new ObjectId(portfolioId),
        userId,
      });
      return doc === null ? null : mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to load calculation preferences', { cause: err });
    }
  }

  async upsert(input: PortfolioCalculationPrefsUpsert): Promise<PortfolioCalculationPrefs> {
    if (!ObjectId.isValid(input.portfolioId)) {
      throw new PersistenceError('Invalid portfolio id');
    }

    const portfolioOid = new ObjectId(input.portfolioId);
    const now = new Date();

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<WithId<PrefsMongoDoc>>(COLLECTION_PORTFOLIO_CALCULATION_PREFS);

      await coll.updateOne(
        { portfolioId: portfolioOid, userId: input.userId },
        {
          $set: {
            broughtForwardLossesGbp: input.broughtForwardLossesGbp,
            registeredForSelfAssessment: input.registeredForSelfAssessment,
            updatedAt: now,
          },
          $setOnInsert: {
            portfolioId: portfolioOid,
            userId: input.userId,
            createdAt: now,
          },
        },
        { upsert: true },
      );

      const doc = await coll.findOne({ portfolioId: portfolioOid, userId: input.userId });
      if (doc === null) {
        throw new PersistenceError('Upsert did not return a readable document');
      }

      return mapDoc(doc);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new PersistenceError('Calculation preferences conflict', { cause: err });
      }

      if (err instanceof PersistenceError) {
        throw err;
      }

      throw new PersistenceError('Failed to save calculation preferences', { cause: err });
    }
  }
}
