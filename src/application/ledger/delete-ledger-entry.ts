import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { DomainError } from '@/shared/errors/app-error';

export type LedgerEntryKind = 'ACQUISITION' | 'DISPOSAL';

export type DeleteLedgerEntryInput = {
  readonly portfolioId: string;
  readonly userId: string;
  readonly kind: LedgerEntryKind;
  readonly entryId: string;
};

export async function deleteLedgerEntry(
  portfolioRepository: PortfolioRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: DeleteLedgerEntryInput,
): Promise<void> {
  const portfolio = await portfolioRepository.findByIdForUser(input.portfolioId, input.userId);
  if (portfolio === null) {
    throw new DomainError('Portfolio not found');
  }

  const deleted =
    input.kind === 'ACQUISITION'
      ? await acquisitionRepository.deleteByIdForPortfolioUser(
          input.portfolioId,
          input.userId,
          input.entryId,
        )
      : await disposalRepository.deleteByIdForPortfolioUser(
          input.portfolioId,
          input.userId,
          input.entryId,
        );

  if (!deleted) {
    throw new DomainError('Entry not found');
  }
}
