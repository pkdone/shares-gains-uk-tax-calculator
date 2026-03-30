import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { CalcEvent, RateTier } from '@/domain/schemas/calculation';
import { calculateGainsForSymbol } from '@/domain/services/cgt-calculator';
import { DomainError } from '@/shared/errors/app-error';

import type { SuccessfulPortfolioCalculation } from '@/application/calculation/calculation-types';
import { buildCalcAcquisitionFromShareAcquisition } from '@/application/calculation/convert-acquisition-fx';

function compareCalcEvents(a: CalcEvent, b: CalcEvent): number {
  const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  if (a.kind === b.kind) {
    return 0;
  }

  return a.kind === 'acquisition' ? -1 : 1;
}

export async function runCalculationForSymbol(params: {
  readonly portfolioRepository: PortfolioRepository;
  readonly acquisitionRepository: ShareAcquisitionRepository;
  readonly disposalRepository: ShareDisposalRepository;
  readonly fxRateRepository: FxRateRepository;
  readonly input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly symbol: string;
    readonly rateTier: RateTier;
    readonly broughtForwardLosses: number;
  };
}): Promise<SuccessfulPortfolioCalculation> {
  const {
    portfolioRepository,
    acquisitionRepository,
    disposalRepository,
    fxRateRepository,
    input,
  } = params;

  const portfolio = await portfolioRepository.findByIdForUser(input.portfolioId, input.userId);
  if (portfolio === null) {
    throw new DomainError('Portfolio not found');
  }

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByPortfolioForUser(input.portfolioId, input.userId),
    disposalRepository.listByPortfolioForUser(input.portfolioId, input.userId),
  ]);

  const symbol = input.symbol.trim();
  const events: CalcEvent[] = [];
  const fxByAcquisitionId: SuccessfulPortfolioCalculation['fxByAcquisitionId'] = {};

  for (const acquisition of acquisitions) {
    if (acquisition.symbol !== symbol) {
      continue;
    }

    const built = await buildCalcAcquisitionFromShareAcquisition({
      acquisition,
      fxRateRepository,
    });
    events.push({ kind: 'acquisition', data: built.data });
    if (built.fx !== undefined) {
      fxByAcquisitionId[built.fx.acquisitionId] = built.fx;
    }
  }

  for (const disposal of disposals) {
    if (disposal.symbol !== symbol) {
      continue;
    }

    events.push({
      kind: 'disposal',
      data: {
        eventDate: disposal.eventDate,
        quantity: disposal.quantity,
        grossProceedsGbp: disposal.grossProceedsGbp,
        feesGbp: disposal.feesGbp,
      },
    });
  }

  events.sort(compareCalcEvents);

  const output = calculateGainsForSymbol({
    symbol,
    events,
    rateTier: input.rateTier,
    broughtForwardLosses: input.broughtForwardLosses,
  });

  return {
    output,
    fxByAcquisitionId,
    warnings: [],
  };
}
