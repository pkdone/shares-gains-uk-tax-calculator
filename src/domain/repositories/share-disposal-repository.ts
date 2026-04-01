import type { ShareDisposal, ShareDisposalBase } from '@/domain/schemas/share-disposal';

export type CreateShareDisposal = ShareDisposalBase & {
  holdingId: string;
  userId: string;
};

export interface ShareDisposalRepository {
  insert(input: CreateShareDisposal): Promise<ShareDisposal>;

  listByHoldingForUser(holdingId: string, userId: string): Promise<ShareDisposal[]>;

  /**
   * Deletes one disposal scoped to holding and user. Returns true if a document was removed.
   */
  deleteByIdForHoldingUser(holdingId: string, userId: string, id: string): Promise<boolean>;
}
