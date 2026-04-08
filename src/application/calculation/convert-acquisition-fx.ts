import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { FxRate } from '@/domain/schemas/fx-rate';
import type { CalcAcquisition } from '@/domain/schemas/calculation';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import { resolveUsdPerGbpFromLookup } from '@/domain/services/fx-lookup';
import { roundMoney2dp } from '@/domain/value-objects/money';

import type { AcquisitionSterlingLine, FxAppliedToAcquisition } from '@/application/calculation/calculation-types';

export async function buildCalcAcquisitionFromShareAcquisition(params: {
  readonly acquisition: ShareAcquisition;
  readonly fxRateRepository: FxRateRepository;
  /**
   * When set (e.g. calculation run), avoids per-row FX queries. Must contain `acquisition.eventDate`.
   */
  readonly fxRateByEventDate?: ReadonlyMap<string, FxRate | null>;
}): Promise<{
  readonly data: CalcAcquisition;
  readonly sterling: AcquisitionSterlingLine;
  readonly fx: FxAppliedToAcquisition;
}> {
  const { acquisition, fxRateRepository, fxRateByEventDate } = params;

  let rateRow: FxRate | null;
  if (fxRateByEventDate === undefined) {
    rateRow = await fxRateRepository.findLatestOnOrBefore(acquisition.eventDate);
  } else {
    rateRow = fxRateByEventDate.get(acquisition.eventDate) ?? null;
  }
  const resolution = resolveUsdPerGbpFromLookup({
    eventDate: acquisition.eventDate,
    rate: rateRow,
  });

  const grossGbp = roundMoney2dp(acquisition.considerationUsd / resolution.usdPerGbp);
  const feesGbp = roundMoney2dp(acquisition.feesUsd / resolution.usdPerGbp);
  const totalCostGbp = roundMoney2dp(grossGbp + feesGbp);

  const data: CalcAcquisition = {
    eventDate: acquisition.eventDate,
    quantity: acquisition.quantity,
    totalCostGbp,
  };

  const sterling: AcquisitionSterlingLine = {
    grossConsiderationGbp: grossGbp,
    feesGbp,
    totalCostGbp,
  };

  const fx: FxAppliedToAcquisition = {
    acquisitionId: acquisition.id,
    eventDate: acquisition.eventDate,
    usdPerGbp: resolution.usdPerGbp,
    rateDateUsed: resolution.rateDateUsed,
    usedFallback: resolution.usedFallback,
  };

  return { data, sterling, fx };
}
