import { filterEtradeDisposalDraftsForHoldingSymbol } from '@/application/import/filter-etrade-disposal-drafts-for-holding-symbol';
import type { ShareDisposalPdfImportDraft } from '@/domain/schemas/share-disposal';

describe('filterEtradeDisposalDraftsForHoldingSymbol', () => {
  const base: Omit<ShareDisposalPdfImportDraft, 'symbol'> = {
    eventDate: '2025-01-01',
    quantity: 10,
    grossProceedsUsd: 100,
    feesUsd: 1,
    firstOrderExecutedRaw: '01/01/2025 10:00:00 AM ET',
  };

  it('keeps matching symbol and aggregates ignored counts', () => {
    const drafts: ShareDisposalPdfImportDraft[] = [
      { ...base, symbol: 'MDB' },
      { ...base, symbol: 'AAPL' },
      { ...base, symbol: 'aapl' },
    ];
    const { matching, ignoredBySymbol } = filterEtradeDisposalDraftsForHoldingSymbol(drafts, 'MDB');
    expect(matching).toHaveLength(1);
    expect(matching[0]?.symbol).toBe('MDB');
    expect(ignoredBySymbol).toEqual([{ symbol: 'AAPL', count: 2 }]);
  });
});
