import type { ShareDisposalPdfImportDraft } from '@/domain/schemas/share-disposal';

import {
  filterDraftsByHoldingSymbol,
  type IgnoredDraftSymbolSummary,
} from '@/application/import/filter-drafts-by-holding-symbol';

export type IgnoredDisposalSymbolSummary = IgnoredDraftSymbolSummary;

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
  return filterDraftsByHoldingSymbol(drafts, holdingSymbolUpper);
}
