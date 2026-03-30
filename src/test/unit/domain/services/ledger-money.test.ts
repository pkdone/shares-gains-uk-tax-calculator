import {
  netDisposalProceedsGbp,
  totalAcquisitionCostGbp,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';

describe('ledger-money', () => {
  it('sums acquisition gross and fees as total cost', () => {
    expect(totalAcquisitionCostGbp(1000, 5.5)).toBe(1005.5);
  });

  it('sums USD acquisition gross and fees', () => {
    expect(totalAcquisitionCostUsd(1000, 2)).toBe(1002);
  });

  it('subtracts fees from disposal gross proceeds', () => {
    expect(netDisposalProceedsGbp(2000, 12)).toBe(1988);
  });
});
