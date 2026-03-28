import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FALLBACK_JEST_URI = 'mongodb://127.0.0.1:27017/jest-fallback';

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === FALLBACK_JEST_URI) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and set your MongoDB Atlas URI.',
    );
  }

  const { ObjectId } = await import('mongodb');
  const { getMongoClient } = await import('../src/infrastructure/persistence/mongodb-client');

  const client = await getMongoClient();
  const collection = client.db().collection('users');
  const userId = 'stub-seed-user';
  const doc = {
    _id: new ObjectId(),
    userId,
    createdAt: new Date(),
  };
  await collection.insertOne(doc);
  const found = await collection.findOne({ userId });
  if (!found) {
    throw new Error('Seed verification failed: user document was not found after insert.');
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
