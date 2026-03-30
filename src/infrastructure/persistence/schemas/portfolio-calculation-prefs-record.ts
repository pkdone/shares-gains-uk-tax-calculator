import { z } from 'zod';

import { portfolioCalculationPrefsUpsertSchema } from '@/domain/schemas/portfolio-calculation-prefs';

export const portfolioCalculationPrefsDocumentSchema = portfolioCalculationPrefsUpsertSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PortfolioCalculationPrefsDocument = z.infer<typeof portfolioCalculationPrefsDocumentSchema>;
