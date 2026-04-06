import type { ShareDisposalPdfImportDraft } from '@/domain/schemas/share-disposal';

export type IgnoredDisposalSymbolSummary = ReadonlyArray<{
  readonly symbol: string;
  readonly count: number;
}>;

/**
 * Keeps import drafts whose symbol matches the holding; aggregates counts of ignored rows by symbol.
 */
export function filterEtradeDisposalDraftsForHoldingSymbol(
  drafts: readonly ShareDisposalPdfImportDraft[],
  holdingSymbolUpper: string,
): {
  readonly matching: ShareDisposalPdfImportDraft[];
  readonly ignoredBySymbol: IgnoredDisposalSymbolSummary;
} {
  const matching: ShareDisposalPdfImportDraft[] = [];
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
