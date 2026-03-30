import {
  netDisposalProceedsGbp,
  netDisposalProceedsUsd,
  pricePerShare,
  totalAcquisitionCostGbp,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';

describe('ledger-money', () => {
  it('sums acquisition consideration and fees as total cost', () => {
    expect(totalAcquisitionCostGbp(1000, 5.5)).toBe(1005.5);
  });

  it('sums USD acquisition consideration and fees', () => {
    expect(totalAcquisitionCostUsd(1000, 2)).toBe(1002);
  });

  it('derives FMV per share as consideration divided by net quantity (import_usd)', () => {
    const taxableGain = 9226.62;
    const vested = 117;
    const netQty = 59;
    const considerationUsd = (taxableGain / vested) * netQty;
    expect(pricePerShare(considerationUsd, netQty)).toBeCloseTo(taxableGain / vested, 10);
  });

  it('subtracts fees from disposal gross proceeds', () => {
    expect(netDisposalProceedsGbp(2000, 12)).toBe(1988);
  });

  it('subtracts fees from disposal gross proceeds (USD)', () => {
    expect(netDisposalProceedsUsd(2000, 12)).toBe(1988);
  });
});
