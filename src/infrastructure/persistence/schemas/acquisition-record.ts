import type { ObjectId } from 'mongodb';
import { z } from 'zod';

import {
  shareAcquisitionImportUsdSchema,
  shareAcquisitionManualGbpSchema,
} from '@/domain/schemas/share-acquisition';

const tenancySchema = z.object({
  portfolioId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const acquisitionManualDocumentSchema = shareAcquisitionManualGbpSchema.merge(tenancySchema);
const acquisitionUsdDocumentSchema = shareAcquisitionImportUsdSchema.merge(tenancySchema);

/**
 * Stored acquisition: domain event fields plus tenancy and timestamps.
 * Zod uses string `portfolioId` for validation / JSON Schema; BSON stores {@link ObjectId} — map in repositories.
 */
export const acquisitionDocumentSchema = z.discriminatedUnion('economicsKind', [
  acquisitionManualDocumentSchema,
  acquisitionUsdDocumentSchema,
]);

/**
 * Same shapes as {@link acquisitionDocumentSchema} but without `portfolioId` on the Zod object,
 * so JSON Schema generation can merge in BSON `portfolioId` via {@link withObjectIdFields}.
 */
export const acquisitionDocumentSchemaForMongoValidator = z.union([
  acquisitionManualDocumentSchema.omit({ portfolioId: true }),
  acquisitionUsdDocumentSchema.omit({ portfolioId: true }),
]);

type AcquisitionDocumentZod = z.infer<typeof acquisitionDocumentSchema>;

/** BSON document: `portfolioId` is ObjectId in MongoDB; Zod validators use string ids for JSON Schema. */
export type AcquisitionDocument =
  | (Omit<Extract<AcquisitionDocumentZod, { economicsKind: 'manual_gbp' }>, 'portfolioId'> & {
      portfolioId: ObjectId;
    })
  | (Omit<Extract<AcquisitionDocumentZod, { economicsKind: 'import_usd' }>, 'portfolioId'> & {
      portfolioId: ObjectId;
    });
