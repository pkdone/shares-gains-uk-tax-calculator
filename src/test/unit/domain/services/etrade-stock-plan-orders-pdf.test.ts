import {
  formatEtradeDisposalImportFingerprintMaterial,
  isSellRestrictedStockOrderType,
  parseEtradeStockPlanOrdersPdfText,
} from '@/domain/services/etrade-stock-plan-orders-pdf';

describe('isSellRestrictedStockOrderType', () => {
  it('accepts Sell Restricted Stock variants', () => {
    expect(isSellRestrictedStockOrderType('Sell Restricted Stock')).toBe(true);
    expect(isSellRestrictedStockOrderType('Sell Restricted Stock GTC')).toBe(true);
    expect(isSellRestrictedStockOrderType('Sell Restricted Stock Mkt')).toBe(true);
  });

  it('rejects Performance and non-plan sells', () => {
    expect(isSellRestrictedStockOrderType('Sell Performance Shares')).toBe(false);
    expect(isSellRestrictedStockOrderType('Sell Stock')).toBe(false);
  });
});

describe('parseEtradeStockPlanOrdersPdfText', () => {
  it('parses a minimal single-order excerpt', () => {
    const text = `
Stock Plan (MDB) foo
Order Summary
Account \tOrder Type \tShares to Sell / Shares Sold
215527284 \tSell Restricted Stock \t1,525
Disbursement Details
Est. Gross Proceeds \tCommission \tSEC Fees \tBrokerage Assist Fee
$632,646.25 \t$7.00 \t$0.00 \t$0.00
Order History
Order Executed \t12/08/2025 09:30:02 AM ET
`;
    const r = parseEtradeStockPlanOrdersPdfText(text);
    expect(r.headerSymbolUpper).toBe('MDB');
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0]?.quantity).toBe(1525);
    expect(r.drafts[0]?.grossProceedsUsd).toBe(632646.25);
    expect(r.drafts[0]?.feesUsd).toBe(7);
    expect(r.drafts[0]?.eventDate).toBe('2025-12-08');
  });

  it('skips non–Restricted-Stock order types', () => {
    const text = `
Stock Plan (MDB)
Order Summary
Account \tOrder Type \tShares to Sell / Shares Sold
215527284 \tSell Performance Shares \t100
Disbursement Details
Est. Gross Proceeds \tCommission \tSEC Fees \tBrokerage Assist Fee
$1.00 \t$0.00 \t$0.00 \t$0.00
Order History
Order Executed \t01/02/2025 09:30:02 AM ET
`;
    const r = parseEtradeStockPlanOrdersPdfText(text);
    expect(r.drafts).toHaveLength(0);
    expect(r.skippedNonRestrictedStock).toBe(1);
  });

  it('skips blocks without Order Executed', () => {
    const text = `
Stock Plan (MDB)
Order Summary
Account \tOrder Type \tShares to Sell / Shares Sold
215527284 \tSell Restricted Stock \t10
Disbursement Details
Est. Gross Proceeds \tCommission \tSEC Fees \tBrokerage Assist Fee
$10.00 \t$0.00 \t$0.00 \t$0.00
Order History
Order Placed \t01/02/2025 09:30:02 AM ET
`;
    const r = parseEtradeStockPlanOrdersPdfText(text);
    expect(r.drafts).toHaveLength(0);
    expect(r.skippedNotExecuted).toBe(1);
  });
});

describe('formatEtradeDisposalImportFingerprintMaterial', () => {
  it('is stable for hashing', () => {
    const a = formatEtradeDisposalImportFingerprintMaterial({
      holdingId: 'abc',
      eventDate: '2025-12-08',
      quantity: 1525,
      grossProceedsUsd: 632646.25,
      feesUsd: 7,
      firstOrderExecutedRaw: '12/08/2025 09:30:02 AM ET',
    });
    const b = formatEtradeDisposalImportFingerprintMaterial({
      holdingId: 'abc',
      eventDate: '2025-12-08',
      quantity: 1525,
      grossProceedsUsd: 632646.25,
      feesUsd: 7,
      firstOrderExecutedRaw: '12/08/2025 09:30:02 AM ET',
    });
    expect(a).toBe(b);
  });
});
