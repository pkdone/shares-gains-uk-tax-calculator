import { z } from 'zod';

/**
 * Canonical ticker for a holding and for acquisition/disposal events.
 * Stored and displayed uppercase; allows dots and similar suffixes (e.g. BRK.B).
 */
export const stockSymbolSchema = z
  .string()
  .trim()
  .min(1, 'Symbol is required')
  .max(32)
  .transform((s) => s.toUpperCase());

export type StockSymbol = z.infer<typeof stockSymbolSchema>;
