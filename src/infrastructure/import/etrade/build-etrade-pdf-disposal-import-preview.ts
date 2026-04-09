import { filterEtradeDisposalDraftsForHoldingSymbol } from '@/application/import/filter-etrade-disposal-drafts-for-holding-symbol';
import type { ShareDisposalPdfImportDraft } from '@/domain/schemas/share-disposal';
import type { EtradeStockPlanOrderParsedDraft } from '@/infrastructure/import/etrade/etrade-stock-plan-orders-pdf';
import { parseEtradeStockPlanOrdersPdfText } from '@/infrastructure/import/etrade/etrade-stock-plan-orders-pdf';

import { computeEtradeDisposalImportFingerprint } from '@/infrastructure/import/etrade/hash-etrade-disposal-import-fingerprint';

function parsedDraftToImportDraft(d: EtradeStockPlanOrderParsedDraft): ShareDisposalPdfImportDraft {
  return {
    symbol: d.symbol,
    eventDate: d.eventDate,
    quantity: d.quantity,
    grossProceedsUsd: d.grossProceedsUsd,
    feesUsd: d.feesUsd,
    firstOrderExecutedRaw: d.firstOrderExecutedRaw,
    rawOrderType: d.rawOrderType,
  };
}

export type EtradePdfDisposalImportPreviewResult =
  | {
      readonly ok: true;
      readonly drafts: readonly ShareDisposalPdfImportDraft[];
      readonly notices: readonly string[];
      readonly ignoredBySymbol: ReturnType<typeof filterEtradeDisposalDraftsForHoldingSymbol>['ignoredBySymbol'];
      readonly skippedNonRestrictedStock: number;
      readonly skippedNotExecuted: number;
      readonly skippedUnparseable: number;
      readonly alreadyImportedCount: number;
      readonly parseIssues: readonly string[];
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly ignoredBySymbol?: ReturnType<typeof filterEtradeDisposalDraftsForHoldingSymbol>['ignoredBySymbol'];
      readonly notices?: readonly string[];
      readonly parseIssues?: readonly string[];
    };

/**
 * Parses E*Trade Stock Plan Orders PDF text, validates header symbol, filters by holding, dedupes by fingerprint.
 */
export function buildEtradePdfDisposalImportPreview(params: {
  readonly text: string;
  readonly holdingId: string;
  readonly holdingSymbolUpper: string;
  readonly existingImportFingerprints: ReadonlySet<string>;
}): EtradePdfDisposalImportPreviewResult {
  const parsed = parseEtradeStockPlanOrdersPdfText(params.text);
  const allDrafts = parsed.drafts.map(parsedDraftToImportDraft);
  const notices: string[] = [];

  if (parsed.skippedNonRestrictedStock > 0) {
    notices.push(
      `Skipped ${parsed.skippedNonRestrictedStock} order block(s) that are not Sell Restricted Stock (e.g. Performance or other types).`,
    );
  }
  if (parsed.skippedNotExecuted > 0) {
    notices.push(`Skipped ${parsed.skippedNotExecuted} order block(s) with no executed time.`);
  }
  if (parsed.skippedUnparseable > 0) {
    notices.push(`Skipped ${parsed.skippedUnparseable} order block(s) that could not be parsed.`);
  }

  if (parsed.headerSymbolUpper !== null && parsed.headerSymbolUpper !== params.holdingSymbolUpper) {
    return {
      ok: false,
      error: `This PDF is for ${parsed.headerSymbolUpper}; this holding is ${params.holdingSymbolUpper}.`,
      parseIssues: parsed.issues,
    };
  }

  if (parsed.headerSymbolUpper === null && parsed.issues.length > 0) {
    return {
      ok: false,
      error: parsed.issues.join(' '),
      parseIssues: parsed.issues,
    };
  }

  const { matching, ignoredBySymbol } = filterEtradeDisposalDraftsForHoldingSymbol(
    allDrafts,
    params.holdingSymbolUpper,
  );

  if (matching.length === 0) {
    return {
      ok: false,
      error: 'No disposals match this holding symbol.',
      ignoredBySymbol,
      notices,
      parseIssues: parsed.issues,
    };
  }

  let alreadyImportedCount = 0;
  const drafts: ShareDisposalPdfImportDraft[] = [];

  for (const d of matching) {
    const fp = computeEtradeDisposalImportFingerprint({
      holdingId: params.holdingId,
      eventDate: d.eventDate,
      quantity: d.quantity,
      grossProceedsUsd: d.grossProceedsUsd,
      feesUsd: d.feesUsd,
      firstOrderExecutedRaw: d.firstOrderExecutedRaw,
    });
    if (params.existingImportFingerprints.has(fp)) {
      alreadyImportedCount += 1;
    } else {
      drafts.push(d);
    }
  }

  if (alreadyImportedCount > 0) {
    notices.push(
      `${alreadyImportedCount} row(s) match disposals already imported from a previous upload (same fingerprint); they are omitted from the preview.`,
    );
  }

  if (drafts.length === 0 && matching.length > 0) {
    return {
      ok: false,
      error: 'All matching rows are already imported for this holding.',
      ignoredBySymbol,
      notices,
      parseIssues: parsed.issues,
    };
  }

  return {
    ok: true,
    drafts,
    notices,
    ignoredBySymbol,
    skippedNonRestrictedStock: parsed.skippedNonRestrictedStock,
    skippedNotExecuted: parsed.skippedNotExecuted,
    skippedUnparseable: parsed.skippedUnparseable,
    alreadyImportedCount,
    parseIssues: parsed.issues,
  };
}
