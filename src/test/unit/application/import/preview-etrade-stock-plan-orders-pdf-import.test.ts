import { buildEtradePdfDisposalImportPreview } from '@/application/import/preview-etrade-stock-plan-orders-pdf-import';

describe('buildEtradePdfDisposalImportPreview', () => {
  it('errors when PDF header symbol does not match holding', () => {
    const text = `
Stock Plan (AAPL)
Order Summary
Account \tOrder Type \tShares to Sell / Shares Sold
215527284 \tSell Restricted Stock \t10
Disbursement Details
Est. Gross Proceeds \tCommission \tSEC Fees \tBrokerage Assist Fee
$100.00 \t$1.00 \t$0.00 \t$0.00
Order History
Order Executed \t01/15/2025 10:00:00 AM ET
`;
    const r = buildEtradePdfDisposalImportPreview({
      text,
      holdingId: 'h1',
      holdingSymbolUpper: 'MDB',
      existingImportFingerprints: new Set(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/This PDF is for AAPL/);
    }
  });

  it('returns drafts when symbol matches and fingerprints are new', () => {
    const text = `
Stock Plan (MDB)
Order Summary
Account \tOrder Type \tShares to Sell / Shares Sold
215527284 \tSell Restricted Stock \t10
Disbursement Details
Est. Gross Proceeds \tCommission \tSEC Fees \tBrokerage Assist Fee
$100.00 \t$1.00 \t$0.00 \t$0.00
Order History
Order Executed \t01/15/2025 10:00:00 AM ET
`;
    const r = buildEtradePdfDisposalImportPreview({
      text,
      holdingId: 'h1',
      holdingSymbolUpper: 'MDB',
      existingImportFingerprints: new Set(),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.drafts.length).toBe(1);
      expect(r.drafts[0]?.symbol).toBe('MDB');
    }
  });
});
