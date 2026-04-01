import type { ObjectId } from 'mongodb';
import { z } from 'zod';

import {
  shareAcquisitionImportUsdSchema,
  shareAcquisitionManualUsdSchema,
} from '@/domain/schemas/share-acquisition';

const tenancySchema = z.object({
  holdingId: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const acquisitionManualDocumentSchema = shareAcquisitionManualUsdSchema.merge(tenancySchema);
const acquisitionUsdDocumentSchema = shareAcquisitionImportUsdSchema.merge(tenancySchema);

/**
 * Stored acquisition: domain event fields plus tenancy and timestamps.
 * Zod uses string `holdingId` for validation / JSON Schema; BSON stores {@link ObjectId} — map in repositories.
 */
export const acquisitionDocumentSchema = z.discriminatedUnion('economicsKind', [
  acquisitionManualDocumentSchema,
  acquisitionUsdDocumentSchema,
]);

/**
 * Same shapes as {@link acquisitionDocumentSchema} but without `holdingId` on the Zod object,
 * so JSON Schema generation can merge in BSON `holdingId` via {@link withObjectIdFields}.
 */
export const acquisitionDocumentSchemaForMongoValidator = z.union([
  acquisitionManualDocumentSchema.omit({ holdingId: true }),
  acquisitionUsdDocumentSchema.omit({ holdingId: true }),
]);

type AcquisitionDocumentZod = z.infer<typeof acquisitionDocumentSchema>;

/** BSON document: `holdingId` is ObjectId in MongoDB; Zod validators use string ids for JSON Schema. */
export type AcquisitionDocument =
  | (Omit<Extract<AcquisitionDocumentZod, { economicsKind: 'manual_usd' }>, 'holdingId'> & {
      holdingId: ObjectId;
    })
  | (Omit<Extract<AcquisitionDocumentZod, { economicsKind: 'import_usd' }>, 'holdingId'> & {
      holdingId: ObjectId;
    });
