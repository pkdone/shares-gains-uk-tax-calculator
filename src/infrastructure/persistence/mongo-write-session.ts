import type { ClientSession } from 'mongodb';

import type { RepositoryWriteOptions } from '@/domain/repositories/repository-write-options';

/** Maps opaque repository `session` to MongoDB driver delete/write options. */
export function mongoSessionForWrites(options?: RepositoryWriteOptions): {
  session?: ClientSession;
} {
  const s = options?.session;
  return s === undefined ? {} : { session: s as ClientSession };
}
