import { requireHoldingForUser } from '@/application/holding/require-holding';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';

import { compareLedgerLines } from './ledger-line-order';
import type { LedgerForHolding, LedgerLine, LedgerTaxYearGroup } from './ledger-types';

export async function getLedgerForHolding(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: { readonly holdingId: string; readonly userId: string },
): Promise<LedgerForHolding> {
  await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByHoldingForUser(input.holdingId, input.userId),
    disposalRepository.listByHoldingForUser(input.holdingId, input.userId),
  ]);

  const lines: LedgerLine[] = [
    ...acquisitions.map((data) => ({ kind: 'ACQUISITION' as const, data })),
    ...disposals.map((data) => ({ kind: 'DISPOSAL' as const, data })),
  ];

  lines.sort(compareLedgerLines);

  const groups = Map.groupBy(lines, (line) => ukTaxYearLabelFromDateOnly(line.data.eventDate));

  const sortedLabels = [...groups.keys()].sort((x, y) => x.localeCompare(y));
  const byTaxYear: LedgerTaxYearGroup[] = sortedLabels.map((taxYearLabel) => ({
    taxYearLabel,
    lines: groups.get(taxYearLabel) ?? [],
  }));

  return {
    holdingId: input.holdingId,
    orderedLines: lines,
    byTaxYear,
  };
}
