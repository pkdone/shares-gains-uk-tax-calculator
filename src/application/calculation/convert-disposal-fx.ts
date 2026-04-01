import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { CalcDisposal } from '@/domain/schemas/calculation';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { resolveUsdPerGbpFromLookup } from '@/domain/services/fx-lookup';
import { roundMoney2dp } from '@/domain/services/section-104-pool';

import type { DisposalSterlingLine, FxAppliedToDisposal } from '@/application/calculation/calculation-types';

export async function buildCalcDisposalFromShareDisposal(params: {
  readonly disposal: ShareDisposal;
  readonly fxRateRepository: FxRateRepository;
}): Promise<{
  readonly data: CalcDisposal;
  readonly sterling: DisposalSterlingLine;
  readonly fx: FxAppliedToDisposal;
}> {
  const { disposal, fxRateRepository } = params;

  const rateRow = await fxRateRepository.findLatestOnOrBefore(disposal.eventDate);
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
