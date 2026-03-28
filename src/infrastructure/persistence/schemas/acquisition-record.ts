import type { ObjectId } from 'mongodb';
import { z } from 'zod';

import { shareAcquisitionBaseSchema } from '@/domain/schemas/share-acquisition';

/**
 * Stored acquisition: domain event fields plus tenancy and timestamps.
 * Zod uses string `portfolioId` for validation / JSON Schema; BSON stores {@link ObjectId} — map in repositories.
 */
export const acquisitionDocumentSchema = shareAcquisitionBaseSchema.extend({
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type AcquisitionDocumentZod = z.infer<typeof acquisitionDocumentSchema>;

export type AcquisitionDocument = Omit<AcquisitionDocumentZod, 'portfolioId'> & {
  portfolioId: ObjectId;
};
