import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { Holding } from '@/domain/schemas/holding';
import { DomainError } from '@/shared/errors/app-error';

export async function requireHoldingForUser(
  holdingRepository: HoldingRepository,
  holdingId: string,
  userId: string,
): Promise<Holding> {
  const holding = await holdingRepository.findByIdForUser(holdingId, userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }
  return holding;
}
