import { MongoClient } from 'mongodb';

import { env } from '@/shared/config/env';

let client: MongoClient | undefined;

/**
 * Returns a singleton MongoDB client connected with {@link env.MONGODB_URI}.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  const next = new MongoClient(env.MONGODB_URI, {
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  });
  await next.connect();
  client = next;
  return client;
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
  if (client) {
    await client.close();
    client = undefined;
  }
}
