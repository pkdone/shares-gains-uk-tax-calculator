import { z } from 'zod';

import { fxRateSchema } from '@/domain/schemas/fx-rate';

/** Stored FX rate row (BoE XUDLUSS), keyed by calendar date. */
export const fxRateDocumentSchema = fxRateSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FxRateDocument = z.infer<typeof fxRateDocumentSchema>;
