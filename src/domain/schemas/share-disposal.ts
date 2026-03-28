import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';

export const shareDisposalBaseSchema = z.object({
  symbol: z.string().trim().min(1).max(32),
  eventDate: dateOnlyStringSchema,
  quantity: z.number().positive().finite(),
  /** Gross proceeds before fees (GBP). */
  grossProceedsGbp: z.number().nonnegative().finite(),
  feesGbp: z.number().nonnegative().finite(),
});

export type ShareDisposalBase = z.infer<typeof shareDisposalBaseSchema>;

export const shareDisposalSchema = shareDisposalBaseSchema.extend({
  id: z.string().min(1),
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ShareDisposal = z.infer<typeof shareDisposalSchema>;
