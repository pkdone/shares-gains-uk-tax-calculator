import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { requireHoldingForUser } from '@/application/holding/require-holding';
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
  await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  await acquisitionRepository.deleteAllForHoldingUser(input.holdingId, input.userId);
  await disposalRepository.deleteAllForHoldingUser(input.holdingId, input.userId);

  const deleted = await holdingRepository.deleteByIdForUser(input.holdingId, input.userId);
  if (!deleted) {
    throw new DomainError('Holding could not be deleted');
  }
}
