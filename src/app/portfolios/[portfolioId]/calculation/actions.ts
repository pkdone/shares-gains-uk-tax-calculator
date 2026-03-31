'use server';

import { revalidatePath } from 'next/cache';

import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoPortfolioCalculationPrefsRepository } from '@/infrastructure/repositories/mongo-portfolio-calculation-prefs-repository';

const prefsRepository = new MongoPortfolioCalculationPrefsRepository();

export async function savePortfolioCalculationPrefs(
  portfolioId: string,
  broughtForwardLossesGbp: number,
  registeredForSelfAssessment: boolean,
): Promise<void> {
  const userId = await requireVerifiedUserId();

  const bf = Number.isFinite(broughtForwardLossesGbp)
    ? Math.max(0, broughtForwardLossesGbp)
    : 0;

  await prefsRepository.upsert({
    portfolioId,
    userId,
    broughtForwardLossesGbp: bf,
    registeredForSelfAssessment,
  });

  revalidatePath(`/portfolios/${portfolioId}/calculation`);
  revalidatePath(`/portfolios/${portfolioId}/computation-pack`);
}
