import { disconnectMongoClient, pingMongoDb } from '@/infrastructure/persistence/mongodb-client';
import { ensureTestDatabase } from '@/test/integration/helpers/ensure-test-database';

describe('mongodb-client integration', () => {
  jest.setTimeout(30_000);

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await disconnectMongoClient();
  });

  it('connects and responds to ping', async () => {
    await expect(pingMongoDb()).resolves.toBe(true);
  });
});
