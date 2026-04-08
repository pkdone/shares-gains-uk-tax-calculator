import { disconnectMongoClient, getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import { COLLECTION_FX_RATES } from '@/infrastructure/persistence/schema-registry';
import { fxRateRepository as repo } from '@/infrastructure/repositories/composition-root';
import { ensureTestDatabase } from '@/test/integration/helpers/ensure-test-database';

describe('MongoFxRateRepository', () => {
  jest.setTimeout(30_000);

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await disconnectMongoClient();
  });

  it('upserts, finds by date, and finds latest on or before', async () => {
    const d1 = '2099-06-01';
    const d2 = '2099-06-02';

    await repo.upsertMany([
      { date: d1, usdPerGbp: 1.26 },
      { date: d2, usdPerGbp: 1.27 },
    ]);

    const exact = await repo.findByDate(d2);
    expect(exact?.usdPerGbp).toBe(1.27);

    const latest = await repo.findLatestOnOrBefore(d2);
    expect(latest?.date).toBe(d2);

    const batch = await repo.findLatestOnOrBeforeForDates([d1, d2, '2099-06-03']);
    expect(batch.get(d1)?.usdPerGbp).toBe(1.26);
    expect(batch.get(d2)?.usdPerGbp).toBe(1.27);
    expect(batch.get('2099-06-03')?.usdPerGbp).toBe(1.27);

    const client = await getMongoClient();
    await client.db().collection(COLLECTION_FX_RATES).deleteMany({ date: { $in: [d1, d2] } });
  });
});
