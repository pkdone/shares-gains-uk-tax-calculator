import type { ShareDisposal, ShareDisposalBase } from '@/domain/schemas/share-disposal';

export type CreateShareDisposal = ShareDisposalBase & {
  portfolioId: string;
  userId: string;
};

export interface ShareDisposalRepository {
  insert(input: CreateShareDisposal): Promise<ShareDisposal>;

  listByPortfolioForUser(portfolioId: string, userId: string): Promise<ShareDisposal[]>;
}
