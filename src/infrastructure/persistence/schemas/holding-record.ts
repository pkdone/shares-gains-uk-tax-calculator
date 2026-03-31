import { z } from 'zod';

import { holdingCreateSchema } from '@/domain/schemas/holding';

export const holdingDocumentSchema = holdingCreateSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type HoldingDocument = z.infer<typeof holdingDocumentSchema>;
