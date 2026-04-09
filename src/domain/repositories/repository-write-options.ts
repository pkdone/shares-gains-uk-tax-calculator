/**
 * Optional flags for repository writes. `session` is an opaque persistence transaction handle
 * (e.g. MongoDB client session) when participating in a multi-document transaction.
 */
export type RepositoryWriteOptions = {
  readonly session?: unknown;
};
