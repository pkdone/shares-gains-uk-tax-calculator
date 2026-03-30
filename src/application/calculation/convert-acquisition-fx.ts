import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { CalcAcquisition } from '@/domain/schemas/calculation';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import { resolveUsdPerGbpFromLookup } from '@/domain/services/fx-lookup';
import { roundMoney2dp } from '@/domain/services/section-104-pool';

import type { FxAppliedToAcquisition } from '@/application/calculation/calculation-types';

export async function buildCalcAcquisitionFromShareAcquisition(params: {
  readonly acquisition: ShareAcquisition;
  readonly fxRateRepository: FxRateRepository;
}): Promise<{ readonly data: CalcAcquisition; readonly fx?: FxAppliedToAcquisition }> {
  const { acquisition, fxRateRepository } = params;

  if (acquisition.economicsKind === 'manual_gbp') {
    const totalCostGbp = roundMoney2dp(
      acquisition.grossConsiderationGbp + acquisition.feesGbp,
    );
    return {
      data: {
        eventDate: acquisition.eventDate,
        quantity: acquisition.quantity,
        totalCostGbp,
      },
    };
  }

  const rateRow = await fxRateRepository.findLatestOnOrBefore(acquisition.eventDate);
  const resolution = resolveUsdPerGbpFromLookup({
    eventDate: acquisition.eventDate,
    rate: rateRow,
  });

  const grossGbp = roundMoney2dp(acquisition.grossConsiderationUsd / resolution.usdPerGbp);
  const feesGbp = roundMoney2dp(acquisition.feesUsd / resolution.usdPerGbp);
  const totalCostGbp = roundMoney2dp(grossGbp + feesGbp);

  return {
    data: {
      eventDate: acquisition.eventDate,
      quantity: acquisition.quantity,
      totalCostGbp,
    },
    fx: {
      acquisitionId: acquisition.id,
      eventDate: acquisition.eventDate,
      usdPerGbp: resolution.usdPerGbp,
      rateDateUsed: resolution.rateDateUsed,
      usedFallback: resolution.usedFallback,
    },
  };
}
