import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { FxRate } from '@/domain/schemas/fx-rate';
import type { CalcDisposal } from '@/domain/schemas/calculation';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { resolveUsdPerGbpFromLookup } from '@/domain/services/fx-lookup';
import { roundMoney2dp } from '@/domain/value-objects/money';

import type { DisposalSterlingLine, FxAppliedToDisposal } from '@/application/calculation/calculation-types';

export async function buildCalcDisposalFromShareDisposal(params: {
  readonly disposal: ShareDisposal;
  readonly fxRateRepository: FxRateRepository;
  /** When set, avoids per-row FX queries. Must contain `disposal.eventDate`. */
  readonly fxRateByEventDate?: ReadonlyMap<string, FxRate | null>;
}): Promise<{
  readonly data: CalcDisposal;
  readonly sterling: DisposalSterlingLine;
  readonly fx: FxAppliedToDisposal;
}> {
  const { disposal, fxRateRepository, fxRateByEventDate } = params;

  let rateRow: FxRate | null;
  if (fxRateByEventDate === undefined) {
    rateRow = await fxRateRepository.findLatestOnOrBefore(disposal.eventDate);
  } else {
    rateRow = fxRateByEventDate.get(disposal.eventDate) ?? null;
  }
  const resolution = resolveUsdPerGbpFromLookup({
    eventDate: disposal.eventDate,
    rate: rateRow,
  });

  const grossProceedsGbp = roundMoney2dp(disposal.grossProceedsUsd / resolution.usdPerGbp);
  const feesGbp = roundMoney2dp(disposal.feesUsd / resolution.usdPerGbp);

  const data: CalcDisposal = {
    eventDate: disposal.eventDate,
    quantity: disposal.quantity,
    grossProceedsGbp,
    feesGbp,
  };

  const sterling: DisposalSterlingLine = {
    grossProceedsGbp,
    feesGbp,
  };

  const fx: FxAppliedToDisposal = {
    disposalId: disposal.id,
    eventDate: disposal.eventDate,
    usdPerGbp: resolution.usdPerGbp,
    rateDateUsed: resolution.rateDateUsed,
    usedFallback: resolution.usedFallback,
  };

  return {
    data,
    sterling,
    fx,
  };
}
