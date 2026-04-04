import type { Holding, HoldingCreate } from '@/domain/schemas/holding';

export interface HoldingRepository {
  create(input: HoldingCreate): Promise<Holding>;

  findByIdForUser(holdingId: string, userId: string): Promise<Holding | null>;

  listByUser(userId: string): Promise<Holding[]>;

  /**
   * Deletes the holding document when it belongs to the user. Returns true if a document was removed.
   */
  deleteByIdForUser(holdingId: string, userId: string): Promise<boolean>;
}
