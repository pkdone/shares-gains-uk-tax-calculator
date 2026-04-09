/**
 * Runs work inside a persistence transaction. The session is opaque to application code and passed to
 * repository write methods that accept optional `RepositoryWriteOptions`.
 */
export type RunPersistenceTransaction = <T>(fn: (session: unknown) => Promise<T>) => Promise<T>;
