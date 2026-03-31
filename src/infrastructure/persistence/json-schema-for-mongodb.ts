/**
 * Converts Zod-derived JSON Schema into a shape MongoDB `$jsonSchema` accepts,
 * and applies BSON-friendly tweaks (`objectId`, `date`, etc.).
 */

export type JsonSchemaNode = Record<string, unknown>;

const UNSUPPORTED_ROOT_KEYS = new Set(['$schema', 'definitions']);

/**
 * Deep-sanitise a JSON Schema object for MongoDB `validator.$jsonSchema`.
 */
export function sanitizeJsonSchemaForMongo(schema: JsonSchemaNode): JsonSchemaNode {
  const clone = structuredClone(schema);
  stripUnsupported(clone);
  convertConstToEnum(clone);
  convertIntegerToNumber(clone);
  normalizeDateStringsToBsonDate(clone);
  return clone;
}

function stripUnsupported(node: unknown): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      stripUnsupported(item);
    }
    return;
  }

  const obj = node as JsonSchemaNode;
  for (const key of Object.keys(obj)) {
    if (UNSUPPORTED_ROOT_KEYS.has(key)) {
      delete obj[key];
      continue;
    }
    if (key === 'format') {
      delete obj[key];
      continue;
    }
    if (key === 'exclusiveMinimum' || key === 'exclusiveMaximum') {
      delete obj[key];
      continue;
    }
    stripUnsupported(obj[key]);
  }
}

function convertConstToEnum(node: unknown): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      convertConstToEnum(item);
    }
    return;
  }

  const obj = node as JsonSchemaNode;
  if ('const' in obj && obj.const !== undefined) {
    obj.enum = [obj.const];
    delete obj.const;
  }

  for (const value of Object.values(obj)) {
    convertConstToEnum(value);
  }
}

function convertIntegerToNumber(node: unknown): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      convertIntegerToNumber(item);
    }
    return;
  }

  const obj = node as JsonSchemaNode;
  if (obj.type === 'integer') {
    obj.type = 'number';
  }

  for (const value of Object.values(obj)) {
    convertIntegerToNumber(value);
  }
}

function normalizeDateStringsToBsonDate(node: unknown): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      normalizeDateStringsToBsonDate(item);
    }
    return;
  }

  const obj = node as JsonSchemaNode;
  const propKeys = ['createdAt', 'updatedAt'];
  for (const key of propKeys) {
    const prop = obj.properties as JsonSchemaNode | undefined;
    if (!prop || typeof prop !== 'object' || !(key in prop)) {
      continue;
    }
    const field = prop[key] as JsonSchemaNode;
    if (field.type === 'string') {
      delete field.type;
      field.bsonType = 'date';
    }
  }

  for (const value of Object.values(obj)) {
    normalizeDateStringsToBsonDate(value);
  }
}

/**
 * Merge explicit BSON `objectId` fields into the root object schema.
 */
export function withObjectIdFields(
  schema: JsonSchemaNode,
  fields: readonly string[],
): JsonSchemaNode {
  const out = structuredClone(schema);
  const props = (out.properties ?? {}) as JsonSchemaNode;
  const required = new Set<string>([...((out.required as string[] | undefined) ?? [])]);

  for (const f of fields) {
    props[f] = { bsonType: 'objectId' };
    required.add(f);
  }

  out.properties = props;
  out.required = [...required];
  return out;
}

/**
 * Injects BSON `objectId` fields into **each** branch of a top-level `anyOf` (from Zod `union`).
 * A sibling `allOf` with `_id` / `holdingId` fails MongoDB validation when each branch has
 * `additionalProperties: false` without those keys.
 */
export function injectBsonObjectIdsIntoEachAnyOfBranch(
  schema: JsonSchemaNode,
  objectIdFieldNames: readonly string[],
): JsonSchemaNode {
  const out = structuredClone(schema);
  const branches = out.anyOf;
  if (!Array.isArray(branches)) {
    return withObjectIdFields(out, objectIdFieldNames);
  }

  for (const branch of branches) {
    if (branch === null || typeof branch !== 'object') {
      continue;
    }
    const b = branch as JsonSchemaNode;
    const props = (b.properties ?? {}) as JsonSchemaNode;
    const required = new Set<string>([...((b.required as string[] | undefined) ?? [])]);

    for (const name of objectIdFieldNames) {
      props[name] = { bsonType: 'objectId' };
      required.add(name);
    }

    b.properties = props;
    b.required = [...required];
  }

  return out;
}
