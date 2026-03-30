'use server';

import { revalidatePath } from 'next/cache';

import { MongoPortfolioCalculationPrefsRepository } from '@/infrastructure/repositories/mongo-portfolio-calculation-prefs-repository';
import { env } from '@/shared/config/env';

const prefsRepository = new MongoPortfolioCalculationPrefsRepository();

export async function savePortfolioCalculationPrefs(
  portfolioId: string,
  broughtForwardLossesGbp: number,
  registeredForSelfAssessment: boolean,
): Promise<void> {
  const bf = Number.isFinite(broughtForwardLossesGbp)
    ? Math.max(0, broughtForwardLossesGbp)
    : 0;

  await prefsRepository.upsert({
    portfolioId,
    userId: env.STUB_USER_ID,
    broughtForwardLossesGbp: bf,
    registeredForSelfAssessment,
  });

  revalidatePath(`/portfolios/${portfolioId}/calculation`);
  revalidatePath(`/portfolios/${portfolioId}/computation-pack`);
}
