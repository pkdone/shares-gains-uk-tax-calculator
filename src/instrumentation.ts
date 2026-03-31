/**
 * Registers graceful MongoDB client shutdown on process signals (containers, local `next start`).
 * Loaded only on the Node.js server runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { disconnectMongoClient } = await import('@/infrastructure/persistence/mongodb-client');

  const shutdown = async (): Promise<void> => {
    await disconnectMongoClient();
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}
