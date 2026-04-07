/**
 * Next.js cache tag for `unstable_cache` around holding CGT calculation.
 * Invalidate with `revalidateTag` whenever ledger data for the holding changes.
 */
export function holdingCalculationCacheTag(holdingId: string): string {
  return `holding-calculation-${holdingId}`;
}
