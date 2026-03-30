import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { CalcDisposal } from '@/domain/schemas/calculation';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { resolveUsdPerGbpFromLookup } from '@/domain/services/fx-lookup';
import { roundMoney2dp } from '@/domain/services/section-104-pool';

export async function buildCalcDisposalFromShareDisposal(params: {
  readonly disposal: ShareDisposal;
  readonly fxRateRepository: FxRateRepository;
}): Promise<{ readonly data: CalcDisposal }> {
  const { disposal, fxRateRepository } = params;

  const rateRow = await fxRateRepository.findLatestOnOrBefore(disposal.eventDate);
  const resolution = resolveUsdPerGbpFromLookup({
    eventDate: disposal.eventDate,
    rate: rateRow,
  });

  const grossProceedsGbp = roundMoney2dp(disposal.grossProceedsUsd / resolution.usdPerGbp);
  const feesGbp = roundMoney2dp(disposal.feesUsd / resolution.usdPerGbp);

  return {
    data: {
      eventDate: disposal.eventDate,
      quantity: disposal.quantity,
      grossProceedsGbp,
      feesGbp,
    },
  };
}
