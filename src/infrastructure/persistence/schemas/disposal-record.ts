import type { ObjectId } from 'mongodb';
import { z } from 'zod';

import { shareDisposalBaseSchema } from '@/domain/schemas/share-disposal';

/**
 * Stored disposal: domain event fields plus tenancy and timestamps.
 * Zod uses string `portfolioId` for validation / JSON Schema; BSON stores {@link ObjectId} — map in repositories.
 */
export const disposalDocumentSchema = shareDisposalBaseSchema.extend({
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type DisposalDocumentZod = z.infer<typeof disposalDocumentSchema>;

export type DisposalDocument = Omit<DisposalDocumentZod, 'portfolioId'> & {
  portfolioId: ObjectId;
};
