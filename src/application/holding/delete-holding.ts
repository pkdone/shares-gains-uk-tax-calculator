import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { DomainError } from '@/shared/errors/app-error';

export type DeleteHoldingInput = {
  readonly holdingId: string;
  readonly userId: string;
};

export async function deleteHolding(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: DeleteHoldingInput,
): Promise<void> {
  const holding = await holdingRepository.findByIdForUser(input.holdingId, input.userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }

  await acquisitionRepository.deleteAllForHoldingUser(input.holdingId, input.userId);
  await disposalRepository.deleteAllForHoldingUser(input.holdingId, input.userId);

  const deleted = await holdingRepository.deleteByIdForUser(input.holdingId, input.userId);
  if (!deleted) {
    throw new DomainError('Holding could not be deleted');
  }
}
