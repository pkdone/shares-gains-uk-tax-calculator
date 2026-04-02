import type {
  ShareAcquisition,
  ShareAcquisitionBase,
  ShareAcquisitionImportUsd,
} from '@/domain/schemas/share-acquisition';

export type CreateShareAcquisition = ShareAcquisitionBase & {
  holdingId: string;
  userId: string;
};

export type UpsertImportUsdBatchResult = {
  readonly inserted: number;
  readonly updated: number;
};

export interface ShareAcquisitionRepository {
  insert(input: CreateShareAcquisition): Promise<ShareAcquisition>;

  insertMany(inputs: readonly CreateShareAcquisition[]): Promise<ShareAcquisition[]>;

  /**
   * E*Trade import: upserts rows that have grant number + vest period; inserts the rest.
   * Re-importing the same vest replaces the existing document (same holding, user, symbol, grant, vest).
   */
  upsertImportUsdBatch(
    holdingId: string,
    userId: string,
    drafts: readonly ShareAcquisitionImportUsd[],
  ): Promise<UpsertImportUsdBatchResult>;

  listByHoldingForUser(holdingId: string, userId: string): Promise<ShareAcquisition[]>;

  /**
   * Deletes one acquisition scoped to holding and user. Returns true if a document was removed.
   */
  deleteByIdForHoldingUser(holdingId: string, userId: string, id: string): Promise<boolean>;

  /**
   * Removes all acquisitions for this holding and user (e.g. when deleting the holding).
   */
  deleteAllForHoldingUser(holdingId: string, userId: string): Promise<number>;
}
