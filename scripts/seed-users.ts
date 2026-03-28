import { config } from 'dotenv';
import { resolve } from 'path';

import { logError, logInfo, logScriptEnd } from '../src/shared/app-logger';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FALLBACK_JEST_URI = 'mongodb://127.0.0.1:27017/jest-fallback';

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === FALLBACK_JEST_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and set your MongoDB Atlas URI.',
    );
  }

  if (!process.env.STUB_USER_ID || process.env.STUB_USER_ID.length < 1) {
    throw new Error('STUB_USER_ID is not set. Copy .env.example and set STUB_USER_ID.');
  }

  const { createConnectedMongoClient } = await import('../src/infrastructure/persistence/mongodb-client');
  const { COLLECTION_USERS } = await import('../src/infrastructure/persistence/schema-registry');

  const userId = process.env.STUB_USER_ID;
  const client = await createConnectedMongoClient();

  try {
    const db = client.db();
    const existing = await db.listCollections({ name: COLLECTION_USERS }).toArray();
    if (existing.length === 0) {
      throw new Error('The users collection does not exist. Run `npm run db:init` first.');
    }

    const collection = db.collection(COLLECTION_USERS);

    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, createdAt: now } },
      { upsert: true, returnDocument: 'after' },
    );

    if (!result) {
      throw new Error('Seed verification failed: user document was not returned after upsert.');
    }

    const found = await collection.findOne({ userId });
    if (!found) {
      throw new Error('Seed verification failed: user document was not found after upsert.');
    }

    logInfo('seed:users — done.');
    logInfo(`  Users ensured (userId): ${userId}`);
    logScriptEnd();
  } finally {
    await client.close();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logError(message);
  logScriptEnd();
  process.exitCode = 1;
});
