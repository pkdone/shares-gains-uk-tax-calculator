import { z } from 'zod';

import { portfolioCreateSchema } from '@/domain/schemas/portfolio';

export const portfolioDocumentSchema = portfolioCreateSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PortfolioDocument = z.infer<typeof portfolioDocumentSchema>;
