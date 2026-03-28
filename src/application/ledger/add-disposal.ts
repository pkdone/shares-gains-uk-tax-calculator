import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type {
  CreateShareDisposal,
  ShareDisposalRepository,
} from '@/domain/repositories/share-disposal-repository';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { DomainError } from '@/shared/errors/app-error';

export async function addDisposal(
  portfolioRepository: PortfolioRepository,
  disposalRepository: ShareDisposalRepository,
  input: CreateShareDisposal,
): Promise<ShareDisposal> {
  const portfolio = await portfolioRepository.findByIdForUser(input.portfolioId, input.userId);
  if (portfolio === null) {
    throw new DomainError('Portfolio not found');
  }

  return disposalRepository.insert(input);
}
