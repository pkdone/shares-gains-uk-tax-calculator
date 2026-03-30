import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type {
  CreateShareAcquisition,
  ShareAcquisitionRepository,
} from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';
import { DomainError } from '@/shared/errors/app-error';

export async function commitEtradeByBenefitImport(
  portfolioRepository: PortfolioRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly drafts: readonly ShareAcquisitionImportUsd[];
  },
): Promise<{ readonly count: number }> {
  if (input.drafts.length === 0) {
    throw new DomainError('Nothing to import');
  }

  const portfolio = await portfolioRepository.findByIdForUser(input.portfolioId, input.userId);
  if (portfolio === null) {
    throw new DomainError('Portfolio not found');
  }

  const rows: CreateShareAcquisition[] = input.drafts.map((d) => ({
    ...d,
    portfolioId: input.portfolioId,
    userId: input.userId,
  }));

  await acquisitionRepository.insertMany(rows);
  return { count: rows.length };
}
