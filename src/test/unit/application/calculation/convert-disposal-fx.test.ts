import { buildCalcDisposalFromShareDisposal } from '@/application/calculation/convert-disposal-fx';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';

function mockFxRepo(latest: { date: string; usdPerGbp: number } | null): FxRateRepository {
  return {
    findByDate: jest.fn(),
    findLatestOnOrBefore: jest.fn().mockResolvedValue(latest),
    upsertMany: jest.fn(),
  };
}

describe('buildCalcDisposalFromShareDisposal', () => {
  it('converts disposal USD to sterling using XUDLUSS', async () => {
    const disposal: ShareDisposal = {
      id: 'd1',
      portfolioId: 'p1',
      userId: 'u1',
      symbol: 'X',
      eventDate: '2024-06-01',
      quantity: 10,
      grossProceedsUsd: 125,
      feesUsd: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const r = await buildCalcDisposalFromShareDisposal({
      disposal,
      fxRateRepository: mockFxRepo({ date: '2024-06-01', usdPerGbp: 1.25 }),
    });

    expect(r.data.grossProceedsGbp).toBe(100);
    expect(r.data.feesGbp).toBe(4);
  });
});
