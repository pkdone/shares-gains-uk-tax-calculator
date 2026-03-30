import { z } from 'zod';

import { dateOnlyStringSchema } from '@/domain/schemas/date-only';

/**
 * Bank of England XUDLUSS: spot rate "US $ into Sterling" — USD per 1 GBP.
 * Example: 1.2625 means 1 GBP = 1.2625 USD.
 */
export const fxRateSchema = z.object({
  date: dateOnlyStringSchema,
  usdPerGbp: z.number().positive().finite(),
});

export type FxRate = z.infer<typeof fxRateSchema>;
