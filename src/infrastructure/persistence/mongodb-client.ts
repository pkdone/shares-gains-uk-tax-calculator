import { MongoClient, type Db } from 'mongodb';

import { MANAGED_COLLECTION_NAMES } from '@/infrastructure/persistence/collection-names';
import { env } from '@/shared/config/env';
import { ConfigurationError } from '@/shared/errors/app-error';

/** Shared driver options for app and Next.js scripts. */
export const MONGODB_CLIENT_OPTIONS = {
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
} as const;

const GLOBAL_MONGO_KEY = '__sharesGainsMongoClientPromise__' as const;

type GlobalWithMongo = typeof globalThis & {
  [GLOBAL_MONGO_KEY]?: Promise<MongoClient>;
};

let productionClientPromise: Promise<MongoClient> | undefined;

/**
 * Connects to MongoDB using {@link env.MONGODB_URI} without validating collections or running DDL.
 * Callers must close the client when done (scripts, integration setup).
 */
export async function createConnectedMongoClient(): Promise<MongoClient> {
  const next = new MongoClient(env.MONGODB_URI, MONGODB_CLIENT_OPTIONS);
  await next.connect();
  return next;
}

/**
 * Throws if any managed collection is missing. Run `npm run db:init` against this database first.
 */
export async function assertExpectedCollectionsExist(db: Db): Promise<void> {
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const missing = MANAGED_COLLECTION_NAMES.filter((n) => !existing.has(n));
  if (missing.length > 0) {
    throw new ConfigurationError(
      `MongoDB is not initialised. Missing collections: ${missing.join(', ')}. Run: npm run db:init`,
    );
  }
}

/**
 * Returns a singleton MongoDB client connected with {@link env.MONGODB_URI}.
 * On first connection, verifies managed collections exist (does not create them).
 *
 * Uses one shared connection promise so concurrent callers await the same connect, and in
 * development caches the promise on `globalThis` so Fast Refresh does not orphan clients.
 */
export async function getMongoClient(): Promise<MongoClient> {
  let pending: Promise<MongoClient> | undefined;
  if (process.env.NODE_ENV === 'development') {
    pending = (globalThis as GlobalWithMongo)[GLOBAL_MONGO_KEY];
  } else {
    pending = productionClientPromise;
  }

  if (!pending) {
    pending = (async () => {
      const next = await createConnectedMongoClient();
      await assertExpectedCollectionsExist(next.db());
      return next;
    })();

    if (process.env.NODE_ENV === 'development') {
      (globalThis as GlobalWithMongo)[GLOBAL_MONGO_KEY] = pending;
    } else {
      productionClientPromise = pending;
    }
  }

  return pending;
}

/**
 * Pings the server. Returns false if ping fails or connection cannot be established.
 */
export async function pingMongoDb(): Promise<boolean> {
  try {
    const c = await getMongoClient();
    await c.db().admin().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Closes the singleton client. Intended for tests and graceful shutdown.
 */
export async function disconnectMongoClient(): Promise<void> {
  let pending: Promise<MongoClient> | undefined;
  if (process.env.NODE_ENV === 'development') {
    pending = (globalThis as GlobalWithMongo)[GLOBAL_MONGO_KEY];
  } else {
    pending = productionClientPromise;
  }

  if (!pending) {
    return;
  }

  try {
    const client = await pending;
    await client.close();
  } finally {
    if (process.env.NODE_ENV === 'development') {
      delete (globalThis as GlobalWithMongo)[GLOBAL_MONGO_KEY];
    } else {
      productionClientPromise = undefined;
    }
  }
}
