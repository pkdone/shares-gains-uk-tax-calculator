import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { Holding, HoldingCreate } from '@/domain/schemas/holding';

export async function createHolding(
  holdingRepository: HoldingRepository,
  input: HoldingCreate,
): Promise<Holding> {
  return holdingRepository.create(input);
}
