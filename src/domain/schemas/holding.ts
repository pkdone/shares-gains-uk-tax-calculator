import { z } from 'zod';

import { stockSymbolSchema } from '@/domain/schemas/stock-symbol';

export const holdingCreateSchema = z.object({
  userId: z.string().min(1),
  symbol: stockSymbolSchema,
});

export type HoldingCreate = z.infer<typeof holdingCreateSchema>;

export const holdingSchema = holdingCreateSchema.extend({
  id: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Holding = z.infer<typeof holdingSchema>;
