import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { CalcEvent } from '@/domain/schemas/calculation';
import { calculateGainsForSymbol } from '@/domain/services/cgt-calculator';
import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';
import { buildMaterialCalculationWarnings, mergeCalculationWarnings } from '@/application/calculation/calculation-warnings';
import { buildCalcAcquisitionFromShareAcquisition } from '@/application/calculation/convert-acquisition-fx';
import { buildCalcDisposalFromShareDisposal } from '@/application/calculation/convert-disposal-fx';
import { compareCalcEvents, compareLedgerLines } from '@/application/ledger/ledger-line-order';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import type { LedgerLine } from '@/application/ledger/ledger-types';

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

  const holding = await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  const symbol = holding.symbol;

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByHoldingForUser(input.holdingId, input.userId),
    disposalRepository.listByHoldingForUser(input.holdingId, input.userId),
  ]);

  const events: CalcEvent[] = [];
  const fxByAcquisitionId: SuccessfulHoldingCalculation['fxByAcquisitionId'] = {};
  const fxByDisposalId: SuccessfulHoldingCalculation['fxByDisposalId'] = {};
  const sterlingByAcquisitionId: SuccessfulHoldingCalculation['sterlingByAcquisitionId'] = {};
  const sterlingByDisposalId: SuccessfulHoldingCalculation['sterlingByDisposalId'] = {};
  const ledgerLines: LedgerLine[] = [];

  for (const acquisition of acquisitions) {
    if (acquisition.symbol !== symbol) {
      continue;
    }

    const built = await buildCalcAcquisitionFromShareAcquisition({
      acquisition,
      fxRateRepository,
    });
    events.push({ kind: 'acquisition', data: built.data });
    sterlingByAcquisitionId[acquisition.id] = built.sterling;
    ledgerLines.push({ kind: 'ACQUISITION', data: acquisition });
    fxByAcquisitionId[built.fx.acquisitionId] = built.fx;
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
    sterlingByDisposalId[disposal.id] = built.sterling;
    fxByDisposalId[built.fx.disposalId] = built.fx;
    ledgerLines.push({ kind: 'DISPOSAL', data: disposal });
  }

  events.sort(compareCalcEvents);
  ledgerLines.sort(compareLedgerLines);

  const output = calculateGainsForSymbol({
    symbol,
    events,
  });

  const materialWarnings = buildMaterialCalculationWarnings({
    ledgerLines,
  });

  return {
    output,
    ledgerLines,
    sterlingByAcquisitionId,
    sterlingByDisposalId,
    fxByAcquisitionId,
    fxByDisposalId,
    warnings: mergeCalculationWarnings(materialWarnings),
  };
}
