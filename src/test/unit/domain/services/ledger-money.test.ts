import { netDisposalProceedsGbp, totalAcquisitionCostGbp } from '@/domain/services/ledger-money';

describe('ledger-money', () => {
  it('sums acquisition gross and fees as total cost', () => {
    expect(totalAcquisitionCostGbp(1000, 5.5)).toBe(1005.5);
  });

  it('subtracts fees from disposal gross proceeds', () => {
    expect(netDisposalProceedsGbp(2000, 12)).toBe(1988);
  });
});
