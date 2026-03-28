import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';

export const shareAcquisitionBaseSchema = z.object({
  symbol: z.string().trim().min(1).max(32),
  eventDate: dateOnlyStringSchema,
  quantity: z.number().positive().finite(),
  /** Total consideration before fees (GBP). */
  grossConsiderationGbp: z.number().nonnegative().finite(),
  /** Allowable incidental costs / fees (GBP). */
  feesGbp: z.number().nonnegative().finite(),
});

export type ShareAcquisitionBase = z.infer<typeof shareAcquisitionBaseSchema>;

export const shareAcquisitionSchema = shareAcquisitionBaseSchema.extend({
  id: z.string().min(1),
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ShareAcquisition = z.infer<typeof shareAcquisitionSchema>;
