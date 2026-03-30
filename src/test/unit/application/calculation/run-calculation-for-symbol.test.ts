import { runCalculationForSymbol } from '@/application/calculation/run-calculation-for-symbol';
import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { Portfolio } from '@/domain/schemas/portfolio';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';

describe('runCalculationForSymbol', () => {
  const portfolio: Portfolio = {
    id: 'p1',
    userId: 'u1',
    name: 'Test',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const portfolioRepository: PortfolioRepository = {
    create: jest.fn(),
    findByIdForUser: jest.fn().mockResolvedValue(portfolio),
    listByUser: jest.fn(),
  };

  const acquisitions: ShareAcquisition[] = [
    {
      id: 'acq1',
      portfolioId: 'p1',
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
      portfolioId: 'p1',
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
    listByPortfolioForUser: jest.fn().mockResolvedValue(acquisitions),
    deleteByIdForPortfolioUser: jest.fn(),
  };

  const disposalRepository: ShareDisposalRepository = {
    insert: jest.fn(),
    listByPortfolioForUser: jest.fn().mockResolvedValue(disposals),
    deleteByIdForPortfolioUser: jest.fn(),
  };

  const fxRateRepository: FxRateRepository = {
    findByDate: jest.fn(),
    findLatestOnOrBefore: jest.fn().mockResolvedValue({ date: '2015-04-01', usdPerGbp: 1.25 }),
    upsertMany: jest.fn(),
  };

  it('returns calculation output for a symbol', async () => {
    const result = await runCalculationForSymbol({
      portfolioRepository,
      acquisitionRepository,
      disposalRepository,
      fxRateRepository,
      input: {
        portfolioId: 'p1',
        userId: 'u1',
        symbol: 'LOB',
        rateTier: 'higher',
        broughtForwardLosses: 0,
      },
    });

    expect(result.output.disposalResults.length).toBe(1);
    expect(result.output.symbol).toBe('LOB');
    expect(Object.keys(result.fxByAcquisitionId).length).toBe(0);
  });
});
