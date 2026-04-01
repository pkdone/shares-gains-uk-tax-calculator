import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { CalcEvent } from '@/domain/schemas/calculation';
import { calculateGainsForSymbol } from '@/domain/services/cgt-calculator';
import { DomainError } from '@/shared/errors/app-error';

import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';
import { buildCalcAcquisitionFromShareAcquisition } from '@/application/calculation/convert-acquisition-fx';
import { buildCalcDisposalFromShareDisposal } from '@/application/calculation/convert-disposal-fx';

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

export async function runCalculationForHoldingSymbol(params: {
  readonly holdingRepository: HoldingRepository;
  readonly acquisitionRepository: ShareAcquisitionRepository;
  readonly disposalRepository: ShareDisposalRepository;
  readonly fxRateRepository: FxRateRepository;
  readonly input: {
    readonly holdingId: string;
    readonly userId: string;
  };
}): Promise<SuccessfulHoldingCalculation> {
  const { holdingRepository, acquisitionRepository, disposalRepository, fxRateRepository, input } =
    params;

  const holding = await holdingRepository.findByIdForUser(input.holdingId, input.userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }

  const symbol = holding.symbol;

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByHoldingForUser(input.holdingId, input.userId),
    disposalRepository.listByHoldingForUser(input.holdingId, input.userId),
  ]);

  const events: CalcEvent[] = [];
  const fxByAcquisitionId: SuccessfulHoldingCalculation['fxByAcquisitionId'] = {};

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

    const built = await buildCalcDisposalFromShareDisposal({
      disposal,
      fxRateRepository,
    });
    events.push({ kind: 'disposal', data: built.data });
  }

  events.sort(compareCalcEvents);

  const output = calculateGainsForSymbol({
    symbol,
    events,
  });

  return {
    output,
    fxByAcquisitionId,
    warnings: [],
  };
}
