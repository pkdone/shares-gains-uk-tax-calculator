import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { Holding } from '@/domain/schemas/holding';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';

describe('runCalculationForHoldingSymbol', () => {
  const holding: Holding = {
    id: 'h1',
    userId: 'u1',
    symbol: 'LOB',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const holdingRepository: HoldingRepository = {
    create: jest.fn(),
    findByIdForUser: jest.fn().mockResolvedValue(holding),
    listByUser: jest.fn(),
    deleteByIdForUser: jest.fn(),
  };

  const acquisitions: ShareAcquisition[] = [
    {
      id: 'acq1',
      holdingId: 'h1',
      userId: 'u1',
      economicsKind: 'manual_usd',
      symbol: 'LOB',
      eventDate: '2015-04-01',
      quantity: 1000,
      considerationUsd: 5125,
      feesUsd: 62.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const disposals: ShareDisposal[] = [
    {
      id: 'd1',
      holdingId: 'h1',
      userId: 'u1',
      symbol: 'LOB',
      eventDate: '2023-05-01',
      quantity: 100,
      grossProceedsUsd: 625,
      feesUsd: 12.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const acquisitionRepository: ShareAcquisitionRepository = {
    insert: jest.fn(),
    insertMany: jest.fn(),
    upsertImportUsdBatch: jest.fn(),
    listByHoldingForUser: jest.fn().mockResolvedValue(acquisitions),
    deleteByIdForHoldingUser: jest.fn(),
    deleteAllForHoldingUser: jest.fn(),
  };

  const disposalRepository: ShareDisposalRepository = {
    insert: jest.fn(),
    insertManyPdfImportBatch: jest.fn(),
    findExistingImportFingerprints: jest.fn().mockResolvedValue(new Set()),
    listByHoldingForUser: jest.fn().mockResolvedValue(disposals),
    deleteByIdForHoldingUser: jest.fn(),
    deleteAllForHoldingUser: jest.fn(),
  };

  const fxRateRepository: FxRateRepository = {
    findByDate: jest.fn(),
    findLatestOnOrBefore: jest.fn().mockResolvedValue({ date: '2015-04-01', usdPerGbp: 1.25 }),
    findLatestOnOrBeforeForDates: jest.fn(async (dates: readonly string[]) => {
      const rate = { date: '2015-04-01', usdPerGbp: 1.25 };
      const m = new Map<string, typeof rate | null>();
      for (const d of dates) {
        m.set(d, rate);
      }
      return await Promise.resolve(m);
    }),
    upsertMany: jest.fn(),
  };

  it('returns calculation output for the holding symbol', async () => {
    const result = await runCalculationForHoldingSymbol({
      holdingRepository,
      acquisitionRepository,
      disposalRepository,
      fxRateRepository,
      input: {
        holdingId: 'h1',
        userId: 'u1',
      },
    });

    expect(result.output.disposalResults.length).toBe(1);
    expect(result.output.symbol).toBe('LOB');
    expect(Object.keys(result.fxByAcquisitionId).length).toBe(1);
    expect(result.fxByAcquisitionId.acq1?.usdPerGbp).toBe(1.25);
    expect(result.ledgerLines).toHaveLength(2);
    expect(Object.keys(result.fxByDisposalId).length).toBe(1);
    expect(result.fxByDisposalId.d1?.usdPerGbp).toBe(1.25);
    expect(result.warnings).toHaveLength(0);
  });
});
