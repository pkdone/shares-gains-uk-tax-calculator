import { acquisitionDocumentSchemaForMongoValidator } from '@/infrastructure/persistence/schemas/acquisition-record';
import { disposalDocumentSchema } from '@/infrastructure/persistence/schemas/disposal-record';
import { fxRateDocumentSchema } from '@/infrastructure/persistence/schemas/fx-rate-record';
import { holdingDocumentSchema } from '@/infrastructure/persistence/schemas/holding-record';
import { userDocumentSchema } from '@/infrastructure/persistence/schemas/user-record';
import {
  injectBsonObjectIdsIntoEachAnyOfBranch,
  type JsonSchemaNode,
} from '@/infrastructure/persistence/json-schema-for-mongodb';
import { zodSchemaToMongoJsonSchema } from '@/infrastructure/persistence/zod-to-mongo-json-schema';

export const COLLECTION_USERS = 'users';
export const COLLECTION_HOLDINGS = 'holdings';
export const COLLECTION_ACQUISITIONS = 'acquisitions';
export const COLLECTION_DISPOSALS = 'disposals';
export const COLLECTION_FX_RATES = 'fx_rates';

const registry: Record<string, JsonSchemaNode> = {};

function getOrBuild(name: string, build: () => JsonSchemaNode): JsonSchemaNode {
  if (registry[name] === undefined) {
    registry[name] = build();
  }
  return registry[name];
}

export function getJsonSchemaForCollection(collectionName: string): JsonSchemaNode {
  switch (collectionName) {
    case COLLECTION_USERS:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(userDocumentSchema, { objectIdFields: ['_id'] }),
      );
    case COLLECTION_HOLDINGS:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(holdingDocumentSchema, { objectIdFields: ['_id'] }),
      );
    case COLLECTION_ACQUISITIONS:
      return getOrBuild(collectionName, () => {
        const unionSchema = zodSchemaToMongoJsonSchema(acquisitionDocumentSchemaForMongoValidator);
        return injectBsonObjectIdsIntoEachAnyOfBranch(unionSchema, ['_id', 'holdingId']);
      });
    case COLLECTION_DISPOSALS:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(disposalDocumentSchema.omit({ holdingId: true }), {
          objectIdFields: ['_id', 'holdingId'],
        }),
      );
    case COLLECTION_FX_RATES:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(fxRateDocumentSchema, { objectIdFields: ['_id'] }),
      );
    default:
      throw new Error(`Unknown collection: ${collectionName}`);
  }
}
