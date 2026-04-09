import type { RunPersistenceTransaction } from '@/application/ports/run-persistence-transaction';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { DomainError } from '@/domain/errors/domain-error';

export type DeleteHoldingInput = {
  readonly holdingId: string;
  readonly userId: string;
};

export async function deleteHolding(
  runTransaction: RunPersistenceTransaction,
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: DeleteHoldingInput,
): Promise<void> {
  await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  await runTransaction(async (session) => {
    const opts = session === undefined ? undefined : { session };
    await acquisitionRepository.deleteAllForHoldingUser(input.holdingId, input.userId, opts);
    await disposalRepository.deleteAllForHoldingUser(input.holdingId, input.userId, opts);

    const deleted = await holdingRepository.deleteByIdForUser(input.holdingId, input.userId, opts);
    if (!deleted) {
      throw new DomainError('Holding could not be deleted');
    }
  });
}
