/**
 * Cache tag for holding CGT calculation (`unstable_cache` today; pair with `unstable_cacheTag` when
 * migrating to `"use cache"`). Invalidate with `revalidateTag` whenever ledger data for the holding changes.
 */
export function holdingCalculationCacheTag(holdingId: string): string {
  return `holding-calculation-${holdingId}`;
}
