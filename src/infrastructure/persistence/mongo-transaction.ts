import type { RunPersistenceTransaction } from '@/application/ports/run-persistence-transaction';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';

/**
 * Runs a callback inside a MongoDB multi-document transaction (requires replica set).
 */
export const runMongoTransaction: RunPersistenceTransaction = async <T>(
  fn: (session: unknown) => Promise<T>,
): Promise<T> => {
  const client = await getMongoClient();
  const mongoSession = client.startSession();
  try {
    return await mongoSession.withTransaction(async () => fn(mongoSession));
  } finally {
    await mongoSession.endSession();
  }
};
