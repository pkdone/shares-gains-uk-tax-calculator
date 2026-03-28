import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { Portfolio, PortfolioCreate } from '@/domain/schemas/portfolio';

export async function createPortfolio(
  portfolioRepository: PortfolioRepository,
  input: PortfolioCreate,
): Promise<Portfolio> {
  return portfolioRepository.create(input);
}
