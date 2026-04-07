import type { LedgerForHolding } from '@/application/ledger/ledger-types';
import {
  netDisposalProceedsUsd,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';

export function computeLedgerUsdTotals(ledger: LedgerForHolding): {
  readonly totalAcquisitionsUsd: number;
  readonly totalDisposalsUsd: number;
  readonly differenceUsd: number;
} {
  let totalAcquisitionsUsd = 0;
  let totalDisposalsUsd = 0;
  for (const line of ledger.orderedLines) {
    if (line.kind === 'ACQUISITION') {
      totalAcquisitionsUsd += totalAcquisitionCostUsd(
        line.data.considerationUsd,
        line.data.feesUsd,
      );
    } else {
      totalDisposalsUsd += netDisposalProceedsUsd(
        line.data.grossProceedsUsd,
        line.data.feesUsd,
      );
    }
  }
  return {
    totalAcquisitionsUsd,
    totalDisposalsUsd,
    differenceUsd: totalAcquisitionsUsd - totalDisposalsUsd,
  };
}
