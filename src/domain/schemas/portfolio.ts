import { z } from 'zod';

export const portfolioNameSchema = z.string().trim().min(1, 'Name is required').max(200);

export const portfolioCreateSchema = z.object({
  userId: z.string().min(1),
  name: portfolioNameSchema,
});

export type PortfolioCreate = z.infer<typeof portfolioCreateSchema>;

export const portfolioSchema = portfolioCreateSchema.extend({
  id: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
