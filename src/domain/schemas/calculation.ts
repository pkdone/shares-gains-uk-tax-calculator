import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';

/** Used by {@link getShareCgtRatePercent} in cgt-config (config/tests only; not user input on calculation UI). */
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
});

export type CalcInput = z.infer<typeof calcInputSchema>;

export const matchingSourceSchema = z.enum(['same-day', 'thirty-day', 'section-104-pool']);

export type MatchingSource = z.infer<typeof matchingSourceSchema>;

export const matchingTrancheSchema = z.object({
  source: matchingSourceSchema,
  quantity: z.number().positive().finite(),
  allowableCostGbp: z.number().finite(),
});

export type MatchingTranche = z.infer<typeof matchingTrancheSchema>;

export const disposalResultSchema = z.object({
  eventDate: dateOnlyStringSchema,
  taxYear: z.string().min(1),
  quantity: z.number().positive().finite(),
  grossProceedsGbp: z.number().nonnegative().finite(),
  disposalFeesGbp: z.number().nonnegative().finite(),
  matchingBreakdown: z.array(matchingTrancheSchema).min(1),
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

/**
 * Per UK tax year, gains/losses for this symbol only (from disposal gain/loss lines).
 * Holding-level capital gains and losses — not overall personal CGT liability, AEA, tax due, or
 * brought-forward losses (those would be user-wide / “tax owed” concerns).
 */
export const taxYearSummarySchema = z.object({
  taxYear: z.string().min(1),
  /** Sum of positive disposal gains in the year. */
  totalGainsGbp: z.number().nonnegative().finite(),
  /** Sum of disposal losses in the year (absolute amounts). */
  totalLossesGbp: z.number().nonnegative().finite(),
  /** Net gain or loss for the year (gains minus losses within the year). */
  netGainsGbp: z.number().finite(),
});

export type TaxYearSummary = z.infer<typeof taxYearSummarySchema>;

export const calcOutputSchema = z.object({
  symbol: z.string().min(1),
  poolSnapshots: z.array(poolSnapshotSchema),
  disposalResults: z.array(disposalResultSchema),
  taxYearSummaries: z.array(taxYearSummarySchema),
});

export type CalcOutput = z.infer<typeof calcOutputSchema>;
