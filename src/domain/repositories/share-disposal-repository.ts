import type { RepositoryWriteOptions } from '@/domain/repositories/repository-write-options';
import type { ShareDisposal, ShareDisposalBase } from '@/domain/schemas/share-disposal';

export type CreateShareDisposal = ShareDisposalBase & {
  holdingId: string;
  userId: string;
};

export type PdfImportDisposalInsertRow = {
  readonly symbol: string;
  readonly eventDate: string;
  readonly quantity: number;
  readonly grossProceedsUsd: number;
  readonly feesUsd: number;
  readonly importSourceFingerprint: string;
};

export interface ShareDisposalRepository {
  insert(input: CreateShareDisposal): Promise<ShareDisposal>;

  /**
   * Inserts multiple PDF-import disposals with fingerprints (idempotent re-import skips duplicates via index).
   */
  insertManyPdfImportBatch(
    holdingId: string,
    userId: string,
    rows: readonly PdfImportDisposalInsertRow[],
  ): Promise<number>;

  /**
   * Returns which of the given import fingerprints already exist for this holding and user.
   */
  findExistingImportFingerprints(
    holdingId: string,
    userId: string,
    fingerprints: readonly string[],
  ): Promise<ReadonlySet<string>>;

  listByHoldingForUser(holdingId: string, userId: string): Promise<ShareDisposal[]>;

  /**
   * Deletes one disposal scoped to holding and user. Returns true if a document was removed.
   */
  deleteByIdForHoldingUser(holdingId: string, userId: string, id: string): Promise<boolean>;

  /**
   * Deletes many disposals by id scoped to holding and user. Returns the number removed.
   */
  deleteManyByIdsForHoldingUser(
    holdingId: string,
    userId: string,
    ids: readonly string[],
    options?: RepositoryWriteOptions,
  ): Promise<number>;

  /**
   * Removes all disposals for this holding and user (e.g. when deleting the holding).
   */
  deleteAllForHoldingUser(
    holdingId: string,
    userId: string,
    options?: RepositoryWriteOptions,
  ): Promise<number>;
}
