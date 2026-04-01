import { filterEtradeDraftsForHoldingSymbol } from '@/application/import/filter-etrade-drafts-for-holding-symbol';
import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';

function draft(symbol: string): ShareAcquisitionImportUsd {
  return {
    economicsKind: 'import_usd',
    symbol,
    eventDate: '2024-01-01',
    quantity: 1,
    considerationUsd: 10,
    feesUsd: 0,
  };
}

describe('filterEtradeDraftsForHoldingSymbol', () => {
  it('keeps matching symbol and counts ignored by other symbols', () => {
    const { matching, ignoredBySymbol } = filterEtradeDraftsForHoldingSymbol(
      [draft('AAPL'), draft('aapl'), draft('MSFT'), draft('MSFT'), draft('GOOG')],
      'AAPL',
    );
    expect(matching).toHaveLength(2);
    expect(ignoredBySymbol).toEqual([
      { symbol: 'GOOG', count: 1 },
      { symbol: 'MSFT', count: 2 },
    ]);
  });
});
