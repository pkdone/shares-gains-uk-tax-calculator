import {
  sanitizeJsonSchemaForMongo,
  withObjectIdFields,
} from '@/infrastructure/persistence/json-schema-for-mongodb';

describe('sanitizeJsonSchemaForMongo', () => {
  it('strips $schema and maps const to enum', () => {
    const input = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        status: { const: 'ACTIVE' },
      },
      required: ['status'],
    };
    const out = sanitizeJsonSchemaForMongo(input);
    expect(out.$schema).toBeUndefined();
    expect((out as { properties: { status: { enum: string[] } } }).properties.status.enum).toEqual([
      'ACTIVE',
    ]);
  });
});

describe('withObjectIdFields', () => {
  it('adds objectId properties', () => {
    const base = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    };
    const out = withObjectIdFields(base, ['_id']);
    expect((out.properties as { _id: { bsonType: string } })._id.bsonType).toBe('objectId');
    expect((out.required as string[]).includes('_id')).toBe(true);
  });
});
