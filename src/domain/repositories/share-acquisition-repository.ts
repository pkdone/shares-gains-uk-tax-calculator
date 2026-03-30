import type {
  ShareAcquisition,
  ShareAcquisitionBase,
  ShareAcquisitionImportUsd,
} from '@/domain/schemas/share-acquisition';

export type CreateShareAcquisition = ShareAcquisitionBase & {
  portfolioId: string;
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
   * Re-importing the same vest replaces the existing document (same portfolio, user, symbol, grant, vest).
   */
  upsertImportUsdBatch(
    portfolioId: string,
    userId: string,
    drafts: readonly ShareAcquisitionImportUsd[],
  ): Promise<UpsertImportUsdBatchResult>;

  listByPortfolioForUser(portfolioId: string, userId: string): Promise<ShareAcquisition[]>;

  /**
   * Deletes one acquisition scoped to portfolio and user. Returns true if a document was removed.
   */
  deleteByIdForPortfolioUser(portfolioId: string, userId: string, id: string): Promise<boolean>;
}
