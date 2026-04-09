import type { ZodType, ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  isJsonSchemaObject,
  sanitizeJsonSchemaForMongo,
  withObjectIdFields,
  type JsonSchemaNode,
} from '@/infrastructure/persistence/json-schema-for-mongodb';

export type ZodToMongoOptions = {
  /** Top-level fields stored as BSON ObjectId (e.g. `_id`, `holdingId`). */
  readonly objectIdFields?: readonly string[];
};

/**
 * Converts a Zod object schema to a MongoDB-compatible `$jsonSchema` object.
 */
export function zodSchemaToMongoJsonSchema(
  schema: ZodTypeAny,
  options?: ZodToMongoOptions,
): JsonSchemaNode {
  const generated = zodToJsonSchema(schema as ZodType, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  });
  if (!isJsonSchemaObject(generated)) {
    throw new Error('zodToJsonSchema did not return a JSON object');
  }
  const raw: JsonSchemaNode = generated;

  const withoutSchemaRoot = { ...raw };
  delete withoutSchemaRoot.$schema;

  let next = sanitizeJsonSchemaForMongo(withoutSchemaRoot);

  const oid = options?.objectIdFields;
  if (oid !== undefined && oid.length > 0) {
    next = withObjectIdFields(next, oid);
  }

  return next;
}
