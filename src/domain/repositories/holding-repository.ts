import type { Holding, HoldingCreate } from '@/domain/schemas/holding';

export interface HoldingRepository {
  create(input: HoldingCreate): Promise<Holding>;

  findByIdForUser(holdingId: string, userId: string): Promise<Holding | null>;

  listByUser(userId: string): Promise<Holding[]>;
}
