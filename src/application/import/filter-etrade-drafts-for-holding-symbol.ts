import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';

export type IgnoredSymbolSummary = ReadonlyArray<{ readonly symbol: string; readonly count: number }>;

/**
 * Keeps import drafts whose symbol matches the holding; aggregates counts of ignored rows by symbol.
 */
export function filterEtradeDraftsForHoldingSymbol(
  drafts: readonly ShareAcquisitionImportUsd[],
  holdingSymbolUpper: string,
): { readonly matching: ShareAcquisitionImportUsd[]; readonly ignoredBySymbol: IgnoredSymbolSummary } {
  const matching: ShareAcquisitionImportUsd[] = [];
  const ignoredCounts = new Map<string, number>();

  for (const d of drafts) {
    const sym = d.symbol.trim().toUpperCase();
    if (sym === holdingSymbolUpper) {
      matching.push(d);
    } else {
      ignoredCounts.set(sym, (ignoredCounts.get(sym) ?? 0) + 1);
    }
  }

  const ignoredBySymbol: { symbol: string; count: number }[] = [...ignoredCounts.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  return { matching, ignoredBySymbol };
}
