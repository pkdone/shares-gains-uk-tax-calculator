/**
 * Converts Zod-derived JSON Schema into a shape MongoDB `$jsonSchema` accepts,
 * and applies BSON-friendly tweaks (`objectId`, `date`, etc.).
 */

export type JsonSchemaNode = Record<string, unknown>;

/**
 * True for plain JSON objects (not arrays, not null). Narrows `unknown` from schema traversal.
 */
export function isJsonSchemaObject(node: unknown): node is JsonSchemaNode {
  return typeof node === 'object' && node !== null && !Array.isArray(node);
}

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
    for (const item of node as unknown[]) {
      stripUnsupported(item);
    }
    return;
  }

  if (!isJsonSchemaObject(node)) {
    return;
  }

  const obj = node;
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
    for (const item of node as unknown[]) {
      convertConstToEnum(item);
    }
    return;
  }

  if (!isJsonSchemaObject(node)) {
    return;
  }

  const obj = node;
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
    for (const item of node as unknown[]) {
      convertIntegerToNumber(item);
    }
    return;
  }

  if (!isJsonSchemaObject(node)) {
    return;
  }

  const obj = node;
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
    for (const item of node as unknown[]) {
      normalizeDateStringsToBsonDate(item);
    }
    return;
  }

  if (!isJsonSchemaObject(node)) {
    return;
  }

  const obj = node;
  const propKeys = ['createdAt', 'updatedAt'];
  for (const key of propKeys) {
    const rawProps = obj.properties;
    if (!isJsonSchemaObject(rawProps) || !Object.hasOwn(rawProps, key)) {
      continue;
    }
    const field = rawProps[key];
    if (isJsonSchemaObject(field) && field.type === 'string') {
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
  const rawProps = out.properties;
  const props = isJsonSchemaObject(rawProps) ? rawProps : {};
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
    if (!isJsonSchemaObject(branch)) {
      continue;
    }
    const b = branch;
    const rawBranchProps = b.properties;
    const props = isJsonSchemaObject(rawBranchProps) ? { ...rawBranchProps } : {};
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
