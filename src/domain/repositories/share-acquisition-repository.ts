import type { ShareAcquisition, ShareAcquisitionBase } from '@/domain/schemas/share-acquisition';

export type CreateShareAcquisition = ShareAcquisitionBase & {
  portfolioId: string;
  userId: string;
};

export interface ShareAcquisitionRepository {
  insert(input: CreateShareAcquisition): Promise<ShareAcquisition>;

  insertMany(inputs: readonly CreateShareAcquisition[]): Promise<ShareAcquisition[]>;

  listByPortfolioForUser(portfolioId: string, userId: string): Promise<ShareAcquisition[]>;
}
