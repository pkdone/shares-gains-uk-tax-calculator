import { ObjectId } from 'mongodb';

import { DomainError } from '@/shared/errors/app-error';
import { disconnectMongoClient, getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import {
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_HOLDINGS,
} from '@/infrastructure/persistence/schema-registry';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { ensureTestDatabase } from '@/test/integration/helpers/ensure-test-database';

describe('manual ledger repositories', () => {
  jest.setTimeout(30_000);

  const userId = 'integration-test-user';

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await disconnectMongoClient();
  });

  it('creates holding, acquisition, disposal; lists by holding', async () => {
    const holdingRepo = new MongoHoldingRepository();
    const acquisitionRepo = new MongoShareAcquisitionRepository();
    const disposalRepo = new MongoShareDisposalRepository();

    const sym = `T${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    const holding = await holdingRepo.create({ userId, symbol: sym });

    const acquisition = await acquisitionRepo.insert({
      holdingId: holding.id,
      userId,
      economicsKind: 'manual_usd',
      symbol: sym,
      eventDate: '2024-06-01',
      quantity: 10,
      considerationUsd: 100,
      feesUsd: 2,
    });

    const disposal = await disposalRepo.insert({
      holdingId: holding.id,
      userId,
      symbol: sym,
      eventDate: '2025-01-10',
      quantity: 5,
      grossProceedsUsd: 80,
      feesUsd: 1,
    });

    const acquisitions = await acquisitionRepo.listByHoldingForUser(holding.id, userId);
    const disposals = await disposalRepo.listByHoldingForUser(holding.id, userId);

    expect(acquisitions.some((a) => a.id === acquisition.id)).toBe(true);
    expect(disposals.some((d) => d.id === disposal.id)).toBe(true);

    expect(await acquisitionRepo.deleteByIdForHoldingUser(holding.id, userId, acquisition.id)).toBe(true);
    expect(await disposalRepo.deleteByIdForHoldingUser(holding.id, userId, disposal.id)).toBe(true);

    const acquisitionsAfter = await acquisitionRepo.listByHoldingForUser(holding.id, userId);
    const disposalsAfter = await disposalRepo.listByHoldingForUser(holding.id, userId);
    expect(acquisitionsAfter.some((a) => a.id === acquisition.id)).toBe(false);
    expect(disposalsAfter.some((d) => d.id === disposal.id)).toBe(false);

    const client = await getMongoClient();
    const db = client.db();
    const hid = new ObjectId(holding.id);
    await db.collection(COLLECTION_ACQUISITIONS).deleteMany({ holdingId: hid });
    await db.collection(COLLECTION_DISPOSALS).deleteMany({ holdingId: hid });
    await db.collection(COLLECTION_HOLDINGS).deleteOne({ _id: hid });
  });

  it('rejects duplicate holding symbol for the same user', async () => {
    const holdingRepo = new MongoHoldingRepository();
    const sym = `D${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    const first = await holdingRepo.create({ userId, symbol: sym });
    await expect(holdingRepo.create({ userId, symbol: sym })).rejects.toThrow(DomainError);
    await expect(holdingRepo.create({ userId, symbol: sym })).rejects.toThrow(
      /already have a holding for this symbol/i,
    );

    const client = await getMongoClient();
    const db = client.db();
    await db.collection(COLLECTION_HOLDINGS).deleteOne({ _id: new ObjectId(first.id) });
  });

  it('bulk-inserts import_usd acquisitions', async () => {
    const holdingRepo = new MongoHoldingRepository();
    const acquisitionRepo = new MongoShareAcquisitionRepository();

    const sym = `M${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    const holding = await holdingRepo.create({ userId, symbol: sym });

    await acquisitionRepo.insertMany([
      {
        holdingId: holding.id,
        userId,
        economicsKind: 'import_usd',
        symbol: sym,
        eventDate: '2024-03-01',
        quantity: 5,
        considerationUsd: 500,
        feesUsd: 0,
      },
    ]);

    const list = await acquisitionRepo.listByHoldingForUser(holding.id, userId);
    expect(list.some((a) => a.economicsKind === 'import_usd' && a.considerationUsd === 500)).toBe(true);

    const client = await getMongoClient();
    const db = client.db();
    const hid = new ObjectId(holding.id);
    await db.collection(COLLECTION_ACQUISITIONS).deleteMany({ holdingId: hid });
    await db.collection(COLLECTION_HOLDINGS).deleteOne({ _id: hid });
  });
});
