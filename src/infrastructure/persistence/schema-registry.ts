import { acquisitionDocumentSchemaForMongoValidator } from '@/infrastructure/persistence/schemas/acquisition-record';
import { disposalDocumentSchema } from '@/infrastructure/persistence/schemas/disposal-record';
import { fxRateDocumentSchema } from '@/infrastructure/persistence/schemas/fx-rate-record';
import { portfolioCalculationPrefsDocumentSchema } from '@/infrastructure/persistence/schemas/portfolio-calculation-prefs-record';
import { portfolioDocumentSchema } from '@/infrastructure/persistence/schemas/portfolio-record';
import { userDocumentSchema } from '@/infrastructure/persistence/schemas/user-record';
import {
  injectBsonObjectIdsIntoEachAnyOfBranch,
  type JsonSchemaNode,
} from '@/infrastructure/persistence/json-schema-for-mongodb';
import { zodSchemaToMongoJsonSchema } from '@/infrastructure/persistence/zod-to-mongo-json-schema';

export const COLLECTION_USERS = 'users';
export const COLLECTION_PORTFOLIOS = 'portfolios';
export const COLLECTION_ACQUISITIONS = 'acquisitions';
export const COLLECTION_DISPOSALS = 'disposals';
export const COLLECTION_FX_RATES = 'fx_rates';
export const COLLECTION_PORTFOLIO_CALCULATION_PREFS = 'portfolio_calculation_prefs';

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
    case COLLECTION_PORTFOLIOS:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(portfolioDocumentSchema, { objectIdFields: ['_id'] }),
      );
    case COLLECTION_ACQUISITIONS:
      return getOrBuild(collectionName, () => {
        const unionSchema = zodSchemaToMongoJsonSchema(acquisitionDocumentSchemaForMongoValidator);
        return injectBsonObjectIdsIntoEachAnyOfBranch(unionSchema, ['_id', 'portfolioId']);
      });
    case COLLECTION_DISPOSALS:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(disposalDocumentSchema.omit({ portfolioId: true }), {
          objectIdFields: ['_id', 'portfolioId'],
        }),
      );
    case COLLECTION_FX_RATES:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(fxRateDocumentSchema, { objectIdFields: ['_id'] }),
      );
    case COLLECTION_PORTFOLIO_CALCULATION_PREFS:
      return getOrBuild(collectionName, () =>
        zodSchemaToMongoJsonSchema(portfolioCalculationPrefsDocumentSchema.omit({ portfolioId: true }), {
          objectIdFields: ['_id', 'portfolioId'],
        }),
      );
    default:
      throw new Error(`Unknown collection: ${collectionName}`);
  }
}
