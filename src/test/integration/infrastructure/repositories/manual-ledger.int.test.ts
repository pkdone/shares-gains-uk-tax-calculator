import { ObjectId } from 'mongodb';

import { deleteHolding } from '@/application/holding/delete-holding';
import { DomainError } from '@/domain/errors/domain-error';
import { disconnectMongoClient, getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import { runMongoTransaction } from '@/infrastructure/persistence/mongo-transaction';
import {
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_HOLDINGS,
} from '@/infrastructure/persistence/schema-registry';
import {
  holdingRepository as holdingRepo,
  shareAcquisitionRepository as acquisitionRepo,
  shareDisposalRepository as disposalRepo,
} from '@/infrastructure/repositories/composition-root';
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

  it('deleteHolding removes acquisitions, disposals, and the holding document', async () => {
    const sym = `K${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    const holding = await holdingRepo.create({ userId, symbol: sym });

    await acquisitionRepo.insert({
      holdingId: holding.id,
      userId,
      economicsKind: 'manual_usd',
      symbol: sym,
      eventDate: '2024-07-01',
      quantity: 3,
      considerationUsd: 30,
      feesUsd: 0,
    });
    await disposalRepo.insert({
      holdingId: holding.id,
      userId,
      symbol: sym,
      eventDate: '2025-02-01',
      quantity: 1,
      grossProceedsUsd: 12,
      feesUsd: 0,
    });

    await deleteHolding(runMongoTransaction, holdingRepo, acquisitionRepo, disposalRepo, {
      holdingId: holding.id,
      userId,
    });

    expect(await acquisitionRepo.listByHoldingForUser(holding.id, userId)).toHaveLength(0);
    expect(await disposalRepo.listByHoldingForUser(holding.id, userId)).toHaveLength(0);
    expect(await holdingRepo.findByIdForUser(holding.id, userId)).toBeNull();
  });

  it('rejects duplicate holding symbol for the same user', async () => {
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
