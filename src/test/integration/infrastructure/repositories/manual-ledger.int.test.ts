import { ObjectId } from 'mongodb';

import { DomainError } from '@/shared/errors/app-error';
import { disconnectMongoClient, getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import {
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_PORTFOLIOS,
} from '@/infrastructure/persistence/schema-registry';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { ensureTestDatabase } from '@/test/integration/helpers/ensure-test-database';

describe('manual ledger repositories', () => {
  jest.setTimeout(30_000);

  const userId = process.env.STUB_USER_ID ?? 'test-stub-user';

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await disconnectMongoClient();
  });

  it('creates portfolio, acquisition, disposal; lists by portfolio', async () => {
    const portfolioRepo = new MongoPortfolioRepository();
    const acquisitionRepo = new MongoShareAcquisitionRepository();
    const disposalRepo = new MongoShareDisposalRepository();

    const portfolio = await portfolioRepo.create({ userId, name: `int-test-${Date.now()}` });

    const acquisition = await acquisitionRepo.insert({
      portfolioId: portfolio.id,
      userId,
      symbol: 'TEST',
      eventDate: '2024-06-01',
      quantity: 10,
      grossConsiderationGbp: 100,
      feesGbp: 2,
    });

    const disposal = await disposalRepo.insert({
      portfolioId: portfolio.id,
      userId,
      symbol: 'TEST',
      eventDate: '2025-01-10',
      quantity: 5,
      grossProceedsGbp: 80,
      feesGbp: 1,
    });

    const acquisitions = await acquisitionRepo.listByPortfolioForUser(portfolio.id, userId);
    const disposals = await disposalRepo.listByPortfolioForUser(portfolio.id, userId);

    expect(acquisitions.some((a) => a.id === acquisition.id)).toBe(true);
    expect(disposals.some((d) => d.id === disposal.id)).toBe(true);

    const client = await getMongoClient();
    const db = client.db();
    const pid = new ObjectId(portfolio.id);
    await db.collection(COLLECTION_ACQUISITIONS).deleteMany({ portfolioId: pid });
    await db.collection(COLLECTION_DISPOSALS).deleteMany({ portfolioId: pid });
    await db.collection(COLLECTION_PORTFOLIOS).deleteOne({ _id: pid });
  });

  it('rejects duplicate portfolio name for the same user', async () => {
    const portfolioRepo = new MongoPortfolioRepository();
    const name = `dup-test-${Date.now()}`;
    const first = await portfolioRepo.create({ userId, name });
    await expect(portfolioRepo.create({ userId, name })).rejects.toThrow(DomainError);
    await expect(portfolioRepo.create({ userId, name })).rejects.toThrow(
      /already have a portfolio with this name/i,
    );

    const client = await getMongoClient();
    const db = client.db();
    await db.collection(COLLECTION_PORTFOLIOS).deleteOne({ _id: new ObjectId(first.id) });
  });
});
