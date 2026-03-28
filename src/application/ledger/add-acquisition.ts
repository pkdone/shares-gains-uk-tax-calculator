import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type {
  CreateShareAcquisition,
  ShareAcquisitionRepository,
} from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import { DomainError } from '@/shared/errors/app-error';

export async function addAcquisition(
  portfolioRepository: PortfolioRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  input: CreateShareAcquisition,
): Promise<ShareAcquisition> {
  const portfolio = await portfolioRepository.findByIdForUser(input.portfolioId, input.userId);
  if (portfolio === null) {
    throw new DomainError('Portfolio not found');
  }

  return acquisitionRepository.insert(input);
}
