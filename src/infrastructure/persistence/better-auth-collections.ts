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
