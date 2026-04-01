import { buildCalculationTransactionTableModel } from '@/application/calculation/build-calculation-transaction-table';
import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';

describe('buildCalculationTransactionTableModel', () => {
  it('interleaves ledger lines and CGT disposal summary', () => {
    const calc: SuccessfulHoldingCalculation = {
      output: {
        symbol: 'X',
        poolSnapshots: [
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-01-01',
            shares: 100,
            costGbp: 1000,
          },
        ],
        disposalResults: [
          {
            eventDate: '2020-06-01',
            taxYear: '2020-21',
            quantity: 10,
            grossProceedsGbp: 200,
            disposalFeesGbp: 0,
            matchingBreakdown: [
              { source: 'section-104-pool', quantity: 10, allowableCostGbp: 100 },
            ],
            allowableCostGbp: 100,
            gainOrLossGbp: 100,
            roundedGainOrLossGbp: 100,
            poolSharesAfter: 90,
            poolCostGbpAfter: 900,
          },
        ],
        taxYearSummaries: [],
      },
      ledgerLines: [
        {
          kind: 'ACQUISITION',
          data: {
            id: 'acq1',
            holdingId: 'h',
            userId: 'u',
            economicsKind: 'manual_usd',
            symbol: 'X',
            eventDate: '2020-01-01',
            quantity: 100,
            considerationUsd: 100,
            feesUsd: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          kind: 'DISPOSAL',
          data: {
            id: 'disp1',
            holdingId: 'h',
            userId: 'u',
            symbol: 'X',
            eventDate: '2020-06-01',
            quantity: 10,
            grossProceedsUsd: 200,
            feesUsd: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      sterlingByAcquisitionId: {
        acq1: { grossConsiderationGbp: 1000, feesGbp: 0, totalCostGbp: 1000 },
      },
      sterlingByDisposalId: {
        disp1: { grossProceedsGbp: 200, feesGbp: 0 },
      },
      fxByAcquisitionId: {},
      fxByDisposalId: {
        disp1: {
          disposalId: 'disp1',
          eventDate: '2020-06-01',
          usdPerGbp: 1,
          rateDateUsed: '2020-06-01',
          usedFallback: false,
        },
      },
      warnings: [],
    };

    const groups = buildCalculationTransactionTableModel(calc);
    const rows = groups.flatMap((g) => g.rows);
    expect(rows.map((r) => r.rowKind)).toEqual([
      'ledger-acquisition',
      'ledger-disposal',
      'cgt-disposal-summary',
    ]);
  });
});
