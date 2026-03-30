import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';

const symbolField = z.string().trim().min(1).max(32);
const eventDateField = dateOnlyStringSchema;
const quantityField = z.number().positive().finite();

/** Manual entry (Milestone 2): sterling economics. */
export const shareAcquisitionManualGbpSchema = z.object({
  economicsKind: z.literal('manual_gbp'),
  symbol: symbolField,
  eventDate: eventDateField,
  quantity: quantityField,
  /** Total consideration before fees (GBP). */
  grossConsiderationGbp: z.number().nonnegative().finite(),
  /** Allowable incidental costs / fees (GBP). */
  feesGbp: z.number().nonnegative().finite(),
});

export type ShareAcquisitionManualGbp = z.infer<typeof shareAcquisitionManualGbpSchema>;

/** E*Trade By Benefit Type import: USD economics until Milestone 5 FX. */
export const shareAcquisitionImportUsdSchema = z.object({
  economicsKind: z.literal('import_usd'),
  symbol: symbolField,
  eventDate: eventDateField,
  quantity: quantityField,
  /** Total consideration before fees (USD). */
  grossConsiderationUsd: z.number().nonnegative().finite(),
  /** Allowable incidental costs / fees (USD). */
  feesUsd: z.number().nonnegative().finite(),
});

export type ShareAcquisitionImportUsd = z.infer<typeof shareAcquisitionImportUsdSchema>;

export const shareAcquisitionBaseSchema = z.discriminatedUnion('economicsKind', [
  shareAcquisitionManualGbpSchema,
  shareAcquisitionImportUsdSchema,
]);

export type ShareAcquisitionBase = z.infer<typeof shareAcquisitionBaseSchema>;

const acquisitionIdentitySchema = z.object({
  id: z.string().min(1),
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const shareAcquisitionSchema = z.discriminatedUnion('economicsKind', [
  shareAcquisitionManualGbpSchema.merge(acquisitionIdentitySchema),
  shareAcquisitionImportUsdSchema.merge(acquisitionIdentitySchema),
]);

export type ShareAcquisition = z.infer<typeof shareAcquisitionSchema>;
