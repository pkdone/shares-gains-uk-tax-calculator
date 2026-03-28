import { createConnectedMongoClient } from '@/infrastructure/persistence/mongodb-client';
import { initMongoDatabase } from '@/infrastructure/persistence/ensure-collections';

/**
 * Provisions validators and indexes so integration tests can call {@link getMongoClient}.
 * Idempotent; closes its own connection (tests use a separate singleton).
 */
export async function ensureTestDatabase(): Promise<void> {
  const mongoClient = await createConnectedMongoClient();
  try {
    await initMongoDatabase(mongoClient.db());
  } finally {
    await mongoClient.close();
  }
}
