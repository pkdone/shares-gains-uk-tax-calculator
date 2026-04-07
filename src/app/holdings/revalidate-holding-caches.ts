import { revalidatePath, revalidateTag } from 'next/cache';

import { holdingCalculationCacheTag } from '@/app/holdings/holding-calculation-cache-tag';

/** After creating a holding: refresh home, list, and the new detail route (no calculation tag yet). */
export function revalidateAfterCreateHolding(holdingId: string): void {
  revalidatePath('/');
  revalidatePath('/holdings');
  revalidatePath(`/holdings/${holdingId}`);
}

/** After ledger row add/remove: detail page and cached calculation subtree. */
export function revalidateHoldingDetailAndCalculation(holdingId: string): void {
  revalidatePath(`/holdings/${holdingId}`);
  revalidateTag(holdingCalculationCacheTag(holdingId));
}

/** After import commit or holding delete: home, list, detail, and calculation cache. */
export function revalidateHoldingSurfaces(holdingId: string): void {
  revalidatePath('/');
  revalidatePath('/holdings');
  revalidatePath(`/holdings/${holdingId}`);
  revalidateTag(holdingCalculationCacheTag(holdingId));
}
