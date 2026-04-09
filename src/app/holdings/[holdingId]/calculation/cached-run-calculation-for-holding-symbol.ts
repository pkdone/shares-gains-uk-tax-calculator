import { unstable_cache } from 'next/cache';

import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import {
  fxRateRepository,
  holdingRepository,
  shareAcquisitionRepository as acquisitionRepository,
  shareDisposalRepository as disposalRepository,
} from '@/infrastructure/repositories/composition-root';

import { holdingCalculationCacheTag } from '@/app/holdings/holding-calculation-cache-tag';

/**
 * Cached CGT pipeline for a holding. Uses `unstable_cache` with tag invalidation via
 * {@link holdingCalculationCacheTag}.
 *
 * When this project adopts Next.js Cache Components and the `"use cache"` directive (see Next.js
 * docs for the matching `experimental` config), replace the wrapper below with a `"use cache"`
 * function and `unstable_cacheTag` from `next/cache`, keeping the same key parts and tag.
 */
export async function cachedRunCalculationForHoldingSymbol(params: {
  readonly holdingId: string;
  readonly userId: string;
}): Promise<Awaited<ReturnType<typeof runCalculationForHoldingSymbol>>> {
  const { holdingId, userId } = params;
  const runCached = unstable_cache(
    async () =>
      runCalculationForHoldingSymbol({
        holdingRepository,
        acquisitionRepository,
        disposalRepository,
        fxRateRepository,
        input: {
          holdingId,
          userId,
        },
      }),
    // Bump version when cached payload shape or warning rules change (invalidates stale entries).
    ['holding-calculation-v2', holdingId, userId],
    { tags: [holdingCalculationCacheTag(holdingId)] },
  );
  return runCached();
}
