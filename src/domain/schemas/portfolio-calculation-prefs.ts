import { z } from 'zod';

/**
 * User-controlled calculation preferences for a portfolio (stub-user tenancy until ADR-007).
 */
export const portfolioCalculationPrefsUpsertSchema = z.object({
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  broughtForwardLossesGbp: z.number().nonnegative().finite(),
  /** For 2023–24+ £50,000 proceeds reporting rule (PRD Appendix 1). */
  registeredForSelfAssessment: z.boolean(),
});

export type PortfolioCalculationPrefsUpsert = z.infer<typeof portfolioCalculationPrefsUpsertSchema>;

export const portfolioCalculationPrefsSchema = portfolioCalculationPrefsUpsertSchema.extend({
  id: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PortfolioCalculationPrefs = z.infer<typeof portfolioCalculationPrefsSchema>;
