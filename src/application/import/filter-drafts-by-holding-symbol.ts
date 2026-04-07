export type IgnoredDraftSymbolSummary = ReadonlyArray<{
  readonly symbol: string;
  readonly count: number;
}>;

/**
 * Keeps drafts whose symbol matches the holding; aggregates counts of ignored rows by symbol.
 */
export function filterDraftsByHoldingSymbol<T extends { readonly symbol: string }>(
  drafts: readonly T[],
  holdingSymbolUpper: string,
): { readonly matching: T[]; readonly ignoredBySymbol: IgnoredDraftSymbolSummary } {
  const matching: T[] = [];
  const ignoredCounts = new Map<string, number>();

  for (const d of drafts) {
    const sym = d.symbol.trim().toUpperCase();
    if (sym === holdingSymbolUpper) {
      matching.push(d);
    } else {
      ignoredCounts.set(sym, (ignoredCounts.get(sym) ?? 0) + 1);
    }
  }

  const ignoredBySymbol = [...ignoredCounts.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  return { matching, ignoredBySymbol };
}
