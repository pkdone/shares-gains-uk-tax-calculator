import type { Portfolio, PortfolioCreate } from '@/domain/schemas/portfolio';

export interface PortfolioRepository {
  create(input: PortfolioCreate): Promise<Portfolio>;

  findByIdForUser(portfolioId: string, userId: string): Promise<Portfolio | null>;

  listByUser(userId: string): Promise<Portfolio[]>;
}
