import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';

import {
  filterDraftsByHoldingSymbol,
  type IgnoredDraftSymbolSummary,
} from '@/application/import/filter-drafts-by-holding-symbol';

export type IgnoredSymbolSummary = IgnoredDraftSymbolSummary;

/**
 * Keeps import drafts whose symbol matches the holding; aggregates counts of ignored rows by symbol.
 */
export function filterEtradeDraftsForHoldingSymbol(
  drafts: readonly ShareAcquisitionImportUsd[],
  holdingSymbolUpper: string,
): { readonly matching: ShareAcquisitionImportUsd[]; readonly ignoredBySymbol: IgnoredSymbolSummary } {
  return filterDraftsByHoldingSymbol(drafts, holdingSymbolUpper);
}
