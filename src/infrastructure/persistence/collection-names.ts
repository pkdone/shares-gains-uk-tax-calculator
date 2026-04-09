/**
 * Single source of truth for MongoDB collection name strings used by this application.
 */

export const COLLECTION_APP_USERS = 'app_users';
export const COLLECTION_HOLDINGS = 'holdings';
export const COLLECTION_ACQUISITIONS = 'acquisitions';
export const COLLECTION_DISPOSALS = 'disposals';
export const COLLECTION_FX_RATES = 'fx_rates';

/** Collections provisioned by `initMongoDatabase` / `npm run db:init`. */
export const MANAGED_COLLECTION_NAMES = [
  COLLECTION_APP_USERS,
  COLLECTION_HOLDINGS,
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_FX_RATES,
] as const;

export type ManagedCollectionName = (typeof MANAGED_COLLECTION_NAMES)[number];

/**
 * MongoDB collection names used by Better Auth’s MongoDB adapter with default
 * `modelName` values (`user`, `session`, `account`, `verification`).
 * If you rename models in `betterAuth({ user: { modelName: ... } })`, update this list.
 *
 * `rateLimit` exists only when `rateLimit.storage === "database"` (not the default).
 */
export const BETTER_AUTH_COLLECTION_NAMES = [
  'session',
  'account',
  'verification',
  'rateLimit',
  'user',
] as const;
