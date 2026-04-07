import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import { DomainError } from '@/domain/errors/domain-error';

export type LedgerEntryKind = 'ACQUISITION' | 'DISPOSAL';

export type DeleteLedgerEntryInput = {
  readonly holdingId: string;
  readonly userId: string;
  readonly kind: LedgerEntryKind;
  readonly entryId: string;
};

export async function deleteLedgerEntry(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: DeleteLedgerEntryInput,
): Promise<void> {
  await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  const deleted =
    input.kind === 'ACQUISITION'
      ? await acquisitionRepository.deleteByIdForHoldingUser(
          input.holdingId,
          input.userId,
          input.entryId,
        )
      : await disposalRepository.deleteByIdForHoldingUser(
          input.holdingId,
          input.userId,
          input.entryId,
        );

  if (!deleted) {
    throw new DomainError('Entry not found');
  }
}
