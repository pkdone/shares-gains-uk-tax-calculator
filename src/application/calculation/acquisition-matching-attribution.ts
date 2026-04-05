import type { DisposalResult } from '@/domain/schemas/calculation';
import { roundMoney2dp } from '@/domain/services/section-104-pool';

export type AcquisitionMatchingAttribution = {
  readonly sameDayQuantity: number;
  readonly sameDayCostGbp: number;
  readonly thirtyDayQuantity: number;
  readonly thirtyDayCostGbp: number;
  /** One row per disposal that took shares under the 30-day rule from this acquisition date. */
  readonly thirtyDayByDisposal: readonly {
    readonly disposalDate: string;
    readonly quantity: number;
    readonly allowableCostGbp: number;
  }[];
  readonly netToPoolQuantity: number;
  readonly netToPoolCostGbp: number;
};

/**
 * Sums same-day and 30-day identification against acquisitions on the given date, using
 * disposal results from the matching engine. Tranches without `acquisitionDate` contribute
 * nothing (legacy data).
 */
export function aggregateAcquisitionMatchingAttribution(params: {
  readonly acquisitionDate: string;
  readonly grossQuantity: number;
  readonly grossCostGbp: number;
  readonly disposalResults: readonly DisposalResult[];
}): AcquisitionMatchingAttribution | null {
  const { acquisitionDate, grossQuantity, grossCostGbp, disposalResults } = params;

  let sameDayQuantity = 0;
  let sameDayCostRunning = 0;
  let thirtyDayQuantity = 0;
  let thirtyDayCostRunning = 0;
  const thirtyDayByDisposal: {
    disposalDate: string;
    quantity: number;
    allowableCostGbp: number;
  }[] = [];

  for (const dr of disposalResults) {
    for (const t of dr.matchingBreakdown) {
      if (t.acquisitionDate !== acquisitionDate) {
        continue;
      }
      if (t.source === 'same-day') {
        sameDayQuantity += t.quantity;
        sameDayCostRunning += t.allowableCostGbp;
      } else if (t.source === 'thirty-day') {
        thirtyDayQuantity += t.quantity;
        thirtyDayCostRunning += t.allowableCostGbp;
        thirtyDayByDisposal.push({
          disposalDate: dr.eventDate,
          quantity: t.quantity,
          allowableCostGbp: t.allowableCostGbp,
        });
      }
    }
  }

  if (sameDayQuantity === 0 && thirtyDayQuantity === 0) {
    return null;
  }

  const sameDayCostGbp = roundMoney2dp(sameDayCostRunning);
  const thirtyDayCostGbp = roundMoney2dp(thirtyDayCostRunning);
  const netToPoolQuantity = grossQuantity - sameDayQuantity - thirtyDayQuantity;
  const netToPoolCostGbp = roundMoney2dp(grossCostGbp - sameDayCostGbp - thirtyDayCostGbp);

  return {
    sameDayQuantity,
    sameDayCostGbp,
    thirtyDayQuantity,
    thirtyDayCostGbp,
    thirtyDayByDisposal,
    netToPoolQuantity,
    netToPoolCostGbp,
  };
}
