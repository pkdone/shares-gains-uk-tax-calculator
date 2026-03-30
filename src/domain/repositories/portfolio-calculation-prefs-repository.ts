import type {
  PortfolioCalculationPrefs,
  PortfolioCalculationPrefsUpsert,
} from '@/domain/schemas/portfolio-calculation-prefs';

export interface PortfolioCalculationPrefsRepository {
  findByPortfolioForUser(
    portfolioId: string,
    userId: string,
  ): Promise<PortfolioCalculationPrefs | null>;

  upsert(input: PortfolioCalculationPrefsUpsert): Promise<PortfolioCalculationPrefs>;
}
