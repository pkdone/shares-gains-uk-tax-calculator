import { disconnectMongoClient, pingMongoDb } from '@/infrastructure/persistence/mongodb-client';

describe('mongodb-client integration', () => {
  jest.setTimeout(30_000);

  afterAll(async () => {
    await disconnectMongoClient();
  });

  it('connects and responds to ping', async () => {
    await expect(pingMongoDb()).resolves.toBe(true);
  });
});
