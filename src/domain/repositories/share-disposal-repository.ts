import type { ShareDisposal, ShareDisposalBase } from '@/domain/schemas/share-disposal';

export type CreateShareDisposal = ShareDisposalBase & {
  portfolioId: string;
  userId: string;
};

export interface ShareDisposalRepository {
  insert(input: CreateShareDisposal): Promise<ShareDisposal>;

  listByPortfolioForUser(portfolioId: string, userId: string): Promise<ShareDisposal[]>;

  /**
   * Deletes one disposal scoped to portfolio and user. Returns true if a document was removed.
   */
  deleteByIdForPortfolioUser(portfolioId: string, userId: string, id: string): Promise<boolean>;
}
