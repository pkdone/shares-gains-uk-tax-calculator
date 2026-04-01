import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';
import { DomainError } from '@/shared/errors/app-error';

import type { LedgerForHolding, LedgerLine, LedgerTaxYearGroup } from './ledger-types';

export async function getLedgerForHolding(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  disposalRepository: ShareDisposalRepository,
  input: { readonly holdingId: string; readonly userId: string },
): Promise<LedgerForHolding> {
  const holding = await holdingRepository.findByIdForUser(input.holdingId, input.userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByHoldingForUser(input.holdingId, input.userId),
    disposalRepository.listByHoldingForUser(input.holdingId, input.userId),
  ]);

  const lines: LedgerLine[] = [
    ...acquisitions.map((data) => ({ kind: 'ACQUISITION' as const, data })),
    ...disposals.map((data) => ({ kind: 'DISPOSAL' as const, data })),
  ];

  lines.sort((a, b) => {
    const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
    if (dateCmp !== 0) {
      return dateCmp;
    }

    const kindRank = (k: LedgerLine['kind']): number => (k === 'ACQUISITION' ? 0 : 1);
    const kindDiff = kindRank(a.kind) - kindRank(b.kind);
    if (kindDiff !== 0) {
      return kindDiff;
    }

    return a.data.id.localeCompare(b.data.id);
  });

  const groups = new Map<string, LedgerLine[]>();
  for (const line of lines) {
    const label = ukTaxYearLabelFromDateOnly(line.data.eventDate);
    const existing = groups.get(label);
    if (existing === undefined) {
      groups.set(label, [line]);
    } else {
      existing.push(line);
    }
  }

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
