import {
  buildCalculationTransactionTableModel,
  type CalculationTransactionAcquisitionAggregateSummaryRow,
  type CalculationTransactionLedgerAcquisitionRow,
  type CalculationTransactionLedgerDisposalRow,
} from '@/application/calculation/build-calculation-transaction-table';
import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';

function makeAcquisitionLedgerLine(overrides: {
  id: string;
  eventDate: string;
  quantity: number;
}) {
  return {
    kind: 'ACQUISITION' as const,
    data: {
      id: overrides.id,
      holdingId: 'h',
      userId: 'u',
      economicsKind: 'manual_usd' as const,
      symbol: 'X',
      eventDate: overrides.eventDate,
      quantity: overrides.quantity,
      considerationUsd: 100,
      feesUsd: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function makeDisposalLedgerLine(overrides: {
  id: string;
  eventDate: string;
  quantity: number;
}) {
  return {
    kind: 'DISPOSAL' as const,
    data: {
      id: overrides.id,
      holdingId: 'h',
      userId: 'u',
      symbol: 'X',
      eventDate: overrides.eventDate,
      quantity: overrides.quantity,
      grossProceedsUsd: 200,
      feesUsd: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe('buildCalculationTransactionTableModel', () => {
  it('places each date in its own block with ledger rows and outcomes', () => {
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
      },
      ledgerLines: [
        makeAcquisitionLedgerLine({ id: 'acq1', eventDate: '2020-01-01', quantity: 100 }),
        makeDisposalLedgerLine({ id: 'disp1', eventDate: '2020-06-01', quantity: 10 }),
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
    expect(groups).toHaveLength(2);

    const acqYear = groups.find((g) => g.taxYearLabel === '2019-20');
    const dispYear = groups.find((g) => g.taxYearLabel === '2020-21');
    expect(acqYear?.totalNetRealisedGainOrLossGbp).toBe(0);
    expect(dispYear?.totalNetRealisedGainOrLossGbp).toBe(100);
    expect(acqYear?.dateBlocks).toHaveLength(1);
    expect(dispYear?.dateBlocks).toHaveLength(1);

    const acqBlock = acqYear?.dateBlocks[0];
    expect(acqBlock?.eventDate).toBe('2020-01-01');
    expect(acqBlock?.ledgerRows).toHaveLength(1);
    expect(acqBlock?.ledgerRows[0]?.rowKind).toBe('ledger-acquisition');
    expect(acqBlock?.outcomes).toHaveLength(1);
    expect(acqBlock?.outcomes[0]?.rowKind).toBe('acquisition-aggregate-summary');

    const acqRow = acqBlock?.ledgerRows[0] as CalculationTransactionLedgerAcquisitionRow;
    expect(acqRow.pricePerShareUsd).toBe(1);
    expect(acqRow.combinedUsd).toBe(100);
    expect(acqRow.fxRate).toBeUndefined();

    const agg = acqBlock?.outcomes[0] as CalculationTransactionAcquisitionAggregateSummaryRow;
    expect(agg.acquisitionLineCount).toBe(1);
    expect(agg.poolSharesAfter).toBe(100);
    expect(agg.poolCostGbpAfter).toBe(1000);

    const dispBlock = dispYear?.dateBlocks[0];
    expect(dispBlock?.ledgerRows).toHaveLength(1);
    expect(dispBlock?.ledgerRows[0]?.rowKind).toBe('ledger-disposal');
    expect(dispBlock?.outcomes).toHaveLength(1);
    expect(dispBlock?.outcomes[0]?.rowKind).toBe('cgt-disposal-summary');

    const dispRow = dispBlock?.ledgerRows[0] as CalculationTransactionLedgerDisposalRow;
    expect(dispRow.pricePerShareUsd).toBe(20);
    expect(dispRow.combinedUsd).toBe(200);
    expect(dispRow.fxRate).toBe(1);
    expect(dispRow.fxUsedFallback).toBe(false);
  });

  it('emits one acquisition outcome per date with pool figures', () => {
    const calc: SuccessfulHoldingCalculation = {
      output: {
        symbol: 'X',
        poolSnapshots: [
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-01-01',
            shares: 50,
            costGbp: 500,
          },
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-03-01',
            shares: 120,
            costGbp: 1700,
          },
        ],
        disposalResults: [],
      },
      ledgerLines: [
        makeAcquisitionLedgerLine({ id: 'acq1', eventDate: '2020-01-01', quantity: 50 }),
        makeAcquisitionLedgerLine({ id: 'acq2', eventDate: '2020-03-01', quantity: 70 }),
      ],
      sterlingByAcquisitionId: {
        acq1: { grossConsiderationGbp: 500, feesGbp: 0, totalCostGbp: 500 },
        acq2: { grossConsiderationGbp: 1200, feesGbp: 0, totalCostGbp: 1200 },
      },
      sterlingByDisposalId: {},
      fxByAcquisitionId: {},
      fxByDisposalId: {},
      warnings: [],
    };

    const groups = buildCalculationTransactionTableModel(calc);
    const blocks = groups.flatMap((g) => g.dateBlocks);
    expect(blocks).toHaveLength(2);

    const o1 = blocks[0]?.outcomes[0] as CalculationTransactionAcquisitionAggregateSummaryRow;
    expect(o1.poolSharesAfter).toBe(50);
    expect(o1.poolCostGbpAfter).toBe(500);
    expect(o1.acquisitionLineCount).toBe(1);

    const o2 = blocks[1]?.outcomes[0] as CalculationTransactionAcquisitionAggregateSummaryRow;
    expect(o2.poolSharesAfter).toBe(120);
    expect(o2.poolCostGbpAfter).toBe(1700);

    const acq1Row = blocks[0]?.ledgerRows[0] as CalculationTransactionLedgerAcquisitionRow;
    expect(acq1Row.pricePerShareUsd).toBe(2);
    expect(acq1Row.combinedUsd).toBe(100);
    expect(acq1Row.fxRate).toBeUndefined();

    const acq2Row = blocks[1]?.ledgerRows[0] as CalculationTransactionLedgerAcquisitionRow;
    expect(acq2Row.pricePerShareUsd).toBeCloseTo(100 / 70);
  });

  it('aggregates same-day acquisitions in one block with one acquisition outcome', () => {
    const calc: SuccessfulHoldingCalculation = {
      output: {
        symbol: 'X',
        poolSnapshots: [
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-01-01',
            shares: 30,
            costGbp: 300,
          },
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-04-01',
            shares: 130,
            costGbp: 2100,
          },
        ],
        disposalResults: [],
      },
      ledgerLines: [
        makeAcquisitionLedgerLine({ id: 'acq1', eventDate: '2020-01-01', quantity: 30 }),
        makeAcquisitionLedgerLine({ id: 'acq2', eventDate: '2020-04-01', quantity: 60 }),
        makeAcquisitionLedgerLine({ id: 'acq3', eventDate: '2020-04-01', quantity: 40 }),
      ],
      sterlingByAcquisitionId: {
        acq1: { grossConsiderationGbp: 300, feesGbp: 0, totalCostGbp: 300 },
        acq2: { grossConsiderationGbp: 1000, feesGbp: 0, totalCostGbp: 1000 },
        acq3: { grossConsiderationGbp: 800, feesGbp: 0, totalCostGbp: 800 },
      },
      sterlingByDisposalId: {},
      fxByAcquisitionId: {},
      fxByDisposalId: {},
      warnings: [],
    };

    const groups = buildCalculationTransactionTableModel(calc);
    const blocks = groups.flatMap((g) => g.dateBlocks);
    expect(blocks).toHaveLength(2);

    expect(blocks[0]?.ledgerRows).toHaveLength(1);
    expect(blocks[1]?.ledgerRows).toHaveLength(2);

    const summaryRow = blocks[1]?.outcomes[0] as CalculationTransactionAcquisitionAggregateSummaryRow;
    expect(summaryRow.totalQuantity).toBe(100);
    expect(summaryRow.totalCostGbp).toBe(1800);
    expect(summaryRow.poolSharesAfter).toBe(130);
    expect(summaryRow.poolCostGbpAfter).toBe(2100);
    expect(summaryRow.acquisitionLineCount).toBe(2);
  });

  it('sets fxRate on acquisition ledger rows when fxByAcquisitionId has an entry', () => {
    const calc: SuccessfulHoldingCalculation = {
      output: {
        symbol: 'X',
        poolSnapshots: [
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-01-01',
            shares: 10,
            costGbp: 100,
          },
        ],
        disposalResults: [],
      },
      ledgerLines: [makeAcquisitionLedgerLine({ id: 'acq1', eventDate: '2020-01-01', quantity: 10 })],
      sterlingByAcquisitionId: {
        acq1: { grossConsiderationGbp: 100, feesGbp: 0, totalCostGbp: 100 },
      },
      sterlingByDisposalId: {},
      fxByAcquisitionId: {
        acq1: {
          acquisitionId: 'acq1',
          eventDate: '2020-01-01',
          usdPerGbp: 1.2543,
          rateDateUsed: '2020-01-01',
          usedFallback: false,
        },
      },
      fxByDisposalId: {},
      warnings: [],
    };

    const groups = buildCalculationTransactionTableModel(calc);
    const acqRow = groups[0]?.dateBlocks[0]?.ledgerRows[0] as CalculationTransactionLedgerAcquisitionRow;
    expect(acqRow.fxRate).toBe(1.2543);
    expect(acqRow.fxUsedFallback).toBe(false);
    expect(acqRow.pricePerShareUsd).toBe(10);
    expect(acqRow.combinedUsd).toBe(100);
  });

  it('orders acquisition outcome before CGT disposal outcome on the same date', () => {
    const calc: SuccessfulHoldingCalculation = {
      output: {
        symbol: 'X',
        poolSnapshots: [
          {
            description: 'Acquisition added to Section 104 pool (unmatched portion)',
            eventDate: '2020-06-15',
            shares: 50,
            costGbp: 500,
          },
          {
            description: 'Disposal matched against Section 104 pool (remainder after same-day and 30-day)',
            eventDate: '2020-06-15',
            shares: 40,
            costGbp: 400,
          },
        ],
        disposalResults: [
          {
            eventDate: '2020-06-15',
            taxYear: '2020-21',
            quantity: 10,
            grossProceedsGbp: 150,
            disposalFeesGbp: 0,
            matchingBreakdown: [
              { source: 'same-day', quantity: 10, allowableCostGbp: 100 },
            ],
            allowableCostGbp: 100,
            gainOrLossGbp: 50,
            roundedGainOrLossGbp: 50,
            poolSharesAfter: 40,
            poolCostGbpAfter: 400,
          },
        ],
      },
      ledgerLines: [
        makeAcquisitionLedgerLine({ id: 'acq1', eventDate: '2020-06-15', quantity: 50 }),
        makeDisposalLedgerLine({ id: 'disp1', eventDate: '2020-06-15', quantity: 10 }),
      ],
      sterlingByAcquisitionId: {
        acq1: { grossConsiderationGbp: 500, feesGbp: 0, totalCostGbp: 500 },
      },
      sterlingByDisposalId: {
        disp1: { grossProceedsGbp: 150, feesGbp: 0 },
      },
      fxByAcquisitionId: {
        acq1: {
          acquisitionId: 'acq1',
          eventDate: '2020-06-15',
          usdPerGbp: 1.3,
          rateDateUsed: '2020-06-15',
          usedFallback: false,
        },
      },
      fxByDisposalId: {
        disp1: {
          disposalId: 'disp1',
          eventDate: '2020-06-15',
          usdPerGbp: 1.3,
          rateDateUsed: '2020-06-15',
          usedFallback: false,
        },
      },
      warnings: [],
    };

    const groups = buildCalculationTransactionTableModel(calc);
    const block = groups[0]?.dateBlocks[0];
    expect(block?.ledgerRows.map((r) => r.rowKind)).toEqual(['ledger-acquisition', 'ledger-disposal']);
    expect(block?.outcomes.map((o) => o.rowKind)).toEqual([
      'acquisition-aggregate-summary',
      'cgt-disposal-summary',
    ]);
  });

  it('sums net realised gains/losses for all disposals in a tax year', () => {
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
          {
            eventDate: '2020-09-01',
            taxYear: '2020-21',
            quantity: 5,
            grossProceedsGbp: 50,
            disposalFeesGbp: 0,
            matchingBreakdown: [
              { source: 'section-104-pool', quantity: 5, allowableCostGbp: 50 },
            ],
            allowableCostGbp: 50,
            gainOrLossGbp: -25,
            roundedGainOrLossGbp: -25,
            poolSharesAfter: 85,
            poolCostGbpAfter: 850,
          },
        ],
      },
      ledgerLines: [
        makeAcquisitionLedgerLine({ id: 'acq1', eventDate: '2020-01-01', quantity: 100 }),
        makeDisposalLedgerLine({ id: 'disp1', eventDate: '2020-06-01', quantity: 10 }),
        makeDisposalLedgerLine({ id: 'disp2', eventDate: '2020-09-01', quantity: 5 }),
      ],
      sterlingByAcquisitionId: {
        acq1: { grossConsiderationGbp: 1000, feesGbp: 0, totalCostGbp: 1000 },
      },
      sterlingByDisposalId: {
        disp1: { grossProceedsGbp: 200, feesGbp: 0 },
        disp2: { grossProceedsGbp: 50, feesGbp: 0 },
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
        disp2: {
          disposalId: 'disp2',
          eventDate: '2020-09-01',
          usdPerGbp: 1,
          rateDateUsed: '2020-09-01',
          usedFallback: false,
        },
      },
      warnings: [],
    };

    const groups = buildCalculationTransactionTableModel(calc);
    const year2020 = groups.find((g) => g.taxYearLabel === '2020-21');
    expect(year2020?.totalNetRealisedGainOrLossGbp).toBe(75);
  });
});
