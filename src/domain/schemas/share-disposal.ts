import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';
import { stockSymbolSchema } from '@/domain/schemas/stock-symbol';

export const shareDisposalBaseSchema = z.object({
  symbol: stockSymbolSchema,
  eventDate: dateOnlyStringSchema,
  quantity: z.number().positive().finite(),
  /** Gross proceeds before fees (USD); converted to sterling at event date for CGT. */
  grossProceedsUsd: z.number().nonnegative().finite(),
  feesUsd: z.number().nonnegative().finite(),
  /** Set for E*Trade PDF imports — SHA-256 hex of canonical import material; enables idempotent re-import. */
  importSourceFingerprint: z.string().min(32).max(128).optional(),
});

export type ShareDisposalBase = z.infer<typeof shareDisposalBaseSchema>;

/** PDF import commit payload: economics plus execution line used for fingerprinting. */
export const shareDisposalPdfImportDraftSchema = shareDisposalBaseSchema
  .omit({ importSourceFingerprint: true })
  .extend({
    firstOrderExecutedRaw: z.string().min(1).max(512),
    /** Preview-only label from the PDF; omitted on persist. */
    rawOrderType: z.string().max(256).optional(),
  });

export type ShareDisposalPdfImportDraft = z.infer<typeof shareDisposalPdfImportDraftSchema>;

export const shareDisposalSchema = shareDisposalBaseSchema.extend({
  id: z.string().min(1),
  holdingId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ShareDisposal = z.infer<typeof shareDisposalSchema>;
