import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';

/** User-declared CGT rate band (income tax band proxy for share CGT rates). */
export const rateTierSchema = z.enum(['basic', 'higher', 'additional']);

export type RateTier = z.infer<typeof rateTierSchema>;

export const calcAcquisitionSchema = z.object({
  eventDate: dateOnlyStringSchema,
  quantity: z.number().positive().finite(),
  /** Gross consideration plus allowable acquisition fees (GBP). */
  totalCostGbp: z.number().nonnegative().finite(),
});

export type CalcAcquisition = z.infer<typeof calcAcquisitionSchema>;

export const calcDisposalSchema = z.object({
  eventDate: dateOnlyStringSchema,
  quantity: z.number().positive().finite(),
  grossProceedsGbp: z.number().nonnegative().finite(),
  feesGbp: z.number().nonnegative().finite(),
});

export type CalcDisposal = z.infer<typeof calcDisposalSchema>;

export const calcEventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('acquisition'),
    data: calcAcquisitionSchema,
  }),
  z.object({
    kind: z.literal('disposal'),
    data: calcDisposalSchema,
  }),
]);

export type CalcEvent = z.infer<typeof calcEventSchema>;

export const calcInputSchema = z.object({
  symbol: z.string().trim().min(1).max(32),
  /** Chronologically ordered; may be empty (no-op calculation). */
  events: z.array(calcEventSchema),
  rateTier: rateTierSchema,
  /** Opening brought-forward losses (GBP) before the first tax year in the stream. */
  broughtForwardLosses: z.number().nonnegative().finite(),
});

export type CalcInput = z.infer<typeof calcInputSchema>;

export const matchingSourceSchema = z.literal('section-104-pool');

export type MatchingSource = z.infer<typeof matchingSourceSchema>;

export const disposalResultSchema = z.object({
  eventDate: dateOnlyStringSchema,
  taxYear: z.string().min(1),
  quantity: z.number().positive().finite(),
  grossProceedsGbp: z.number().nonnegative().finite(),
  disposalFeesGbp: z.number().nonnegative().finite(),
  matchingSource: matchingSourceSchema,
  allowableCostGbp: z.number().finite(),
  gainOrLossGbp: z.number().finite(),
  /** Whole pounds (SA108-style rounding). */
  roundedGainOrLossGbp: z.number().finite(),
  poolSharesAfter: z.number().nonnegative().finite(),
  poolCostGbpAfter: z.number().finite(),
});

export type DisposalResult = z.infer<typeof disposalResultSchema>;

export const poolSnapshotSchema = z.object({
  description: z.string().min(1),
  eventDate: dateOnlyStringSchema,
  shares: z.number().nonnegative().finite(),
  costGbp: z.number().finite(),
});

export type PoolSnapshot = z.infer<typeof poolSnapshotSchema>;

export const rateBreakdownRowSchema = z.object({
  ratePct: z.number().nonnegative().finite(),
  gainsGbp: z.number().nonnegative().finite(),
  taxGbp: z.number().nonnegative().finite(),
});

export type RateBreakdownRow = z.infer<typeof rateBreakdownRowSchema>;

export const taxYearSummarySchema = z.object({
  taxYear: z.string().min(1),
  totalGainsGbp: z.number().nonnegative().finite(),
  totalLossesGbp: z.number().nonnegative().finite(),
  currentYearLossesAppliedGbp: z.number().nonnegative().finite(),
  broughtForwardLossesAppliedGbp: z.number().nonnegative().finite(),
  netGainsAfterLossesGbp: z.number().finite(),
  aeaGbp: z.number().nonnegative().finite(),
  taxableGainGbp: z.number().nonnegative().finite(),
  cgtDueGbp: z.number().nonnegative().finite(),
  lossesCarriedForwardGbp: z.number().nonnegative().finite(),
  rateBreakdown: z.array(rateBreakdownRowSchema),
});

export type TaxYearSummary = z.infer<typeof taxYearSummarySchema>;

export const calcOutputSchema = z.object({
  symbol: z.string().min(1),
  poolSnapshots: z.array(poolSnapshotSchema),
  disposalResults: z.array(disposalResultSchema),
  taxYearSummaries: z.array(taxYearSummarySchema),
});

export type CalcOutput = z.infer<typeof calcOutputSchema>;
