import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';
import { stockSymbolSchema } from '@/domain/schemas/stock-symbol';

const symbolField = stockSymbolSchema;
const eventDateField = dateOnlyStringSchema;
const quantityField = z.number().positive().finite();

/** E*Trade-style broker ids; absent on manual-only rows. */
const optionalBrokerGrantFieldsSchema = z.object({
  grantNumber: z.string().trim().min(1).max(128).nullish(),
  vestPeriod: z.string().trim().min(1).max(128).nullish(),
});

/**
 * Shared USD economics and event identity fields for manual entry and E*Trade import.
 * Import-only vest metadata is added on {@link shareAcquisitionImportUsdSchema}.
 */
const shareAcquisitionUsdEventFieldsSchema = z.object({
  symbol: symbolField,
  eventDate: eventDateField,
  /** Net shares acquired (after sell-to-cover for imports); canonical for CGT and ledger Qty. */
  quantity: quantityField,
  /** Total consideration before fees (USD), for the acquired (net) quantity. */
  considerationUsd: z.number().nonnegative().finite(),
  /** Allowable incidental costs / fees (USD). */
  feesUsd: z.number().nonnegative().finite(),
  ...optionalBrokerGrantFieldsSchema.shape,
});

/** Manual entry: USD economics; converted to sterling at event date for CGT. */
export const shareAcquisitionManualUsdSchema = shareAcquisitionUsdEventFieldsSchema.extend({
  economicsKind: z.literal('manual_usd'),
});

export type ShareAcquisitionManualUsd = z.infer<typeof shareAcquisitionManualUsdSchema>;

/** E*Trade By Benefit Type import: USD economics; optional RSU vest / sell-to-cover columns. */
export const shareAcquisitionImportUsdSchema = shareAcquisitionUsdEventFieldsSchema.extend({
  economicsKind: z.literal('import_usd'),
  /** Gross shares vested for this event (before shares sold/withheld for taxes). Omitted on legacy imports. */
  grossVestedQuantity: z.number().positive().finite().optional(),
  /** Shares sold or withheld for taxes (sell-to-cover). Omitted on legacy imports. */
  sharesTradedForTaxes: z.number().nonnegative().finite().optional(),
});

export type ShareAcquisitionImportUsd = z.infer<typeof shareAcquisitionImportUsdSchema>;

export const shareAcquisitionBaseSchema = z.discriminatedUnion('economicsKind', [
  shareAcquisitionManualUsdSchema,
  shareAcquisitionImportUsdSchema,
]);

export type ShareAcquisitionBase = z.infer<typeof shareAcquisitionBaseSchema>;

const acquisitionIdentitySchema = z.object({
  id: z.string().min(1),
  holdingId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const shareAcquisitionSchema = z.discriminatedUnion('economicsKind', [
  shareAcquisitionManualUsdSchema.merge(acquisitionIdentitySchema),
  shareAcquisitionImportUsdSchema.merge(acquisitionIdentitySchema),
]);

export type ShareAcquisition = z.infer<typeof shareAcquisitionSchema>;
