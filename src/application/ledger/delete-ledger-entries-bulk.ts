import type { RunPersistenceTransaction } from '@/application/ports/run-persistence-transaction';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { DomainError } from '@/domain/errors/domain-error';

import type { LedgerEntryKind } from './delete-ledger-entry';

export type BulkLedgerEntryRow = {
  readonly kind: LedgerEntryKind;
  readonly entryId: string;
};

export async function deleteLedgerEntriesBulk(
  runTransaction: RunPersistenceTransaction,
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: {
    readonly holdingId: string;
    readonly userId: string;
    readonly entries: readonly BulkLedgerEntryRow[];
  },
): Promise<void> {
  const { entries } = input;
  if (entries.length === 0) {
    return;
  }

  await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  const acquisitionIds = [...new Set(entries.filter((e) => e.kind === 'ACQUISITION').map((e) => e.entryId))];
  const disposalIds = [...new Set(entries.filter((e) => e.kind === 'DISPOSAL').map((e) => e.entryId))];

  await runTransaction(async (session) => {
    const opts = session === undefined ? undefined : { session };

    const acqRemoved =
      acquisitionIds.length === 0
        ? 0
        : await acquisitionRepository.deleteManyByIdsForHoldingUser(
            input.holdingId,
            input.userId,
            acquisitionIds,
            opts,
          );

    const dispRemoved =
      disposalIds.length === 0
        ? 0
        : await disposalRepository.deleteManyByIdsForHoldingUser(
            input.holdingId,
            input.userId,
            disposalIds,
            opts,
          );

    if (acqRemoved !== acquisitionIds.length || dispRemoved !== disposalIds.length) {
      throw new DomainError('One or more entries were not found');
    }
  });
}
