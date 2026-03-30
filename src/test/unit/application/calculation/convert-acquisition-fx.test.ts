import { buildCalcAcquisitionFromShareAcquisition } from '@/application/calculation/convert-acquisition-fx';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';

function mockFxRepo(latest: { date: string; usdPerGbp: number } | null): FxRateRepository {
  return {
    findByDate: jest.fn(),
    findLatestOnOrBefore: jest.fn().mockResolvedValue(latest),
    upsertMany: jest.fn(),
  };
}

describe('buildCalcAcquisitionFromShareAcquisition', () => {
  it('sums manual GBP gross and fees', async () => {
    const acquisition: ShareAcquisition = {
      id: 'a1',
      portfolioId: 'p1',
      userId: 'u1',
      economicsKind: 'manual_gbp',
      symbol: 'X',
      eventDate: '2024-01-01',
      quantity: 10,
      grossConsiderationGbp: 100,
      feesGbp: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const r = await buildCalcAcquisitionFromShareAcquisition({
      acquisition,
      fxRateRepository: mockFxRepo(null),
    });

    expect(r.fx).toBeUndefined();
    expect(r.data.totalCostGbp).toBe(105);
  });

  it('converts import USD using XUDLUSS', async () => {
    const acquisition: ShareAcquisition = {
      id: 'a2',
      portfolioId: 'p1',
      userId: 'u1',
      economicsKind: 'import_usd',
      symbol: 'X',
      eventDate: '2024-01-02',
      quantity: 1,
      grossConsiderationUsd: 126.25,
      feesUsd: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const r = await buildCalcAcquisitionFromShareAcquisition({
      acquisition,
      fxRateRepository: mockFxRepo({ date: '2024-01-02', usdPerGbp: 1.2625 }),
    });

    expect(r.fx?.usedFallback).toBe(false);
    expect(r.data.totalCostGbp).toBe(100);
  });
});
