/**
 * Parses e*Trade Stock Plan Orders PDF plain text into disposal drafts (Restricted Stock sells, executed only).
 */

const STOCK_PLAN_SYMBOL_PATTERN = /Stock Plan \(([^)]+)\)/i;

const ORDER_SUMMARY_ROW_PATTERN = /^\s*(\d{6,14})\s+(.+?)\s+([\d,]+)\s*$/;
const DISBURSEMENT_FEE_ROW_PATTERN =
  /Est\.\s*Gross Proceeds\s+Commission\s+SEC Fees\s+Brokerage Assist Fee\s*\n\s*(\$[\d,]+\.\d{2})\s+(\$[\d,]+\.\d{2})\s+(\$[\d,]+\.\d{2})\s+(\$[\d,]+\.\d{2})/;
const ORDER_EXECUTED_FULL_PATTERN =
  /Order Executed\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+ET)/;
const ORDER_EXECUTED_DATE_PATTERN = /Order Executed\s+(\d{1,2}\/\d{1,2}\/\d{4})/;

/** Sell-to-cover style RSU disposals: order type must reference Restricted Stock sale, not Performance. */
export function isSellRestrictedStockOrderType(orderType: string): boolean {
  const t = orderType.trim();
  if (t.length === 0) {
    return false;
  }
  if (/performance/i.test(t)) {
    return false;
  }
  return /sell\s+restricted\s+stock/i.test(t);
}

export type EtradeStockPlanOrderParsedDraft = {
  readonly symbol: string;
  readonly eventDate: string;
  readonly quantity: number;
  readonly grossProceedsUsd: number;
  readonly feesUsd: number;
  readonly rawOrderType: string;
  readonly firstOrderExecutedRaw: string;
};

export type EtradeStockPlanOrdersPdfParseResult = {
  readonly headerSymbolUpper: string | null;
  readonly drafts: readonly EtradeStockPlanOrderParsedDraft[];
  readonly skippedNonRestrictedStock: number;
  readonly skippedNotExecuted: number;
  readonly skippedUnparseable: number;
  readonly issues: readonly string[];
};

function parseUsdToNumber(raw: string): number {
  const n = Number.parseFloat(raw.replaceAll(/[$,]/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
}

function parseShareQuantity(raw: string): number {
  const n = Number.parseFloat(raw.replaceAll(',', ''));
  return Number.isFinite(n) ? n : Number.NaN;
}

function executionDatePartToIso(mmddyyyy: string): string | null {
  const parts = mmddyyyy.split('/');
  if (parts.length !== 3) {
    return null;
  }
  const month = Number.parseInt(parts[0] ?? '', 10);
  const day = Number.parseInt(parts[1] ?? '', 10);
  const year = Number.parseInt(parts[2] ?? '', 10);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractHeaderSymbolUpper(text: string): string | null {
  STOCK_PLAN_SYMBOL_PATTERN.lastIndex = 0;
  const m = STOCK_PLAN_SYMBOL_PATTERN.exec(text);
  if (m?.[1] === undefined) {
    return null;
  }
  return m[1].trim().toUpperCase();
}

function splitOrderBlocks(fullText: string): string[] {
  const parts = fullText.split(/\nOrder Summary\n/);
  if (parts.length < 2) {
    return [];
  }
  const blocks: string[] = [];
  for (let i = 1; i < parts.length; i += 1) {
    blocks.push(`Order Summary\n${parts[i]}`);
  }
  return blocks;
}

function parseOrderBlock(block: string, symbolUpper: string):
  | { readonly kind: 'ok'; readonly draft: EtradeStockPlanOrderParsedDraft }
  | { readonly kind: 'skip'; readonly reason: 'nonRestricted' | 'notExecuted' | 'unparseable' } {
  const summaryPart = block.split('Disbursement Details')[0];
  if (summaryPart === undefined) {
    return { kind: 'skip', reason: 'unparseable' };
  }

  const lines = summaryPart.split('\n');
  let orderTypeRaw = '';
  let quantity = Number.NaN;
  let foundRow = false;

  for (const line of lines) {
    ORDER_SUMMARY_ROW_PATTERN.lastIndex = 0;
    const m = ORDER_SUMMARY_ROW_PATTERN.exec(line);
    if (m?.[1] !== undefined && m[2] !== undefined && m[3] !== undefined) {
      orderTypeRaw = m[2].trim();
      quantity = parseShareQuantity(m[3]);
      foundRow = true;
      break;
    }
  }

  if (!foundRow || orderTypeRaw.length === 0) {
    return { kind: 'skip', reason: 'unparseable' };
  }

  if (!isSellRestrictedStockOrderType(orderTypeRaw)) {
    return { kind: 'skip', reason: 'nonRestricted' };
  }

  const disbPart = block.split('Disbursement Details')[1];
  if (disbPart === undefined) {
    return { kind: 'skip', reason: 'unparseable' };
  }

  DISBURSEMENT_FEE_ROW_PATTERN.lastIndex = 0;
  const feeMatch = DISBURSEMENT_FEE_ROW_PATTERN.exec(disbPart);
  if (
    feeMatch?.[1] === undefined ||
    feeMatch[2] === undefined ||
    feeMatch[3] === undefined ||
    feeMatch[4] === undefined
  ) {
    return { kind: 'skip', reason: 'unparseable' };
  }

  const grossProceedsUsd = parseUsdToNumber(feeMatch[1]);
  const commission = parseUsdToNumber(feeMatch[2]);
  const secFees = parseUsdToNumber(feeMatch[3]);
  const brokerageAssist = parseUsdToNumber(feeMatch[4]);
  const feesUsd = commission + secFees + brokerageAssist;

  if (
    !Number.isFinite(grossProceedsUsd) ||
    grossProceedsUsd < 0 ||
    !Number.isFinite(feesUsd) ||
    feesUsd < 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return { kind: 'skip', reason: 'unparseable' };
  }

  ORDER_EXECUTED_FULL_PATTERN.lastIndex = 0;
  const execMatch = ORDER_EXECUTED_FULL_PATTERN.exec(block);
  ORDER_EXECUTED_DATE_PATTERN.lastIndex = 0;
  const dateOnlyMatch = ORDER_EXECUTED_DATE_PATTERN.exec(block);
  if (dateOnlyMatch?.[1] === undefined) {
    return { kind: 'skip', reason: 'notExecuted' };
  }

  const iso = executionDatePartToIso(dateOnlyMatch[1]);
  if (iso === null) {
    return { kind: 'skip', reason: 'unparseable' };
  }

  const firstExecutedRaw = execMatch?.[1] ?? dateOnlyMatch[0].replace(/^Order Executed\s+/i, '').trim();

  return {
    kind: 'ok',
    draft: {
      symbol: symbolUpper,
      eventDate: iso,
      quantity,
      grossProceedsUsd,
      feesUsd,
      rawOrderType: orderTypeRaw,
      firstOrderExecutedRaw: firstExecutedRaw,
    },
  };
}

/**
 * Parses e*Trade Stock Plan Orders PDF plain text into per-order disposal drafts.
 */
export function parseEtradeStockPlanOrdersPdfText(text: string): EtradeStockPlanOrdersPdfParseResult {
  const issues: string[] = [];
  const headerSymbolUpper = extractHeaderSymbolUpper(text);
  if (headerSymbolUpper === null) {
    issues.push('Could not find "Stock Plan (TICKER)" in the PDF; cannot determine symbol.');
  }

  const symbolUpper = headerSymbolUpper ?? 'UNKNOWN';
  const blocks = splitOrderBlocks(text);
  if (blocks.length === 0) {
    issues.push('No "Order Summary" sections found — is this a Stock Plan Orders export?');
  }

  const drafts: EtradeStockPlanOrderParsedDraft[] = [];
  let skippedNonRestrictedStock = 0;
  let skippedNotExecuted = 0;
  let skippedUnparseable = 0;

  for (const block of blocks) {
    const r = parseOrderBlock(block, symbolUpper);
    if (r.kind === 'ok') {
      drafts.push(r.draft);
    } else if (r.reason === 'nonRestricted') {
      skippedNonRestrictedStock += 1;
    } else if (r.reason === 'notExecuted') {
      skippedNotExecuted += 1;
    } else {
      skippedUnparseable += 1;
    }
  }

  return {
    headerSymbolUpper,
    drafts,
    skippedNonRestrictedStock,
    skippedNotExecuted,
    skippedUnparseable,
    issues,
  };
}

/**
 * Canonical material string for SHA-256 fingerprinting (application layer hashes this).
 */
export function formatEtradeDisposalImportFingerprintMaterial(params: {
  readonly holdingId: string;
  readonly eventDate: string;
  readonly quantity: number;
  readonly grossProceedsUsd: number;
  readonly feesUsd: number;
  readonly firstOrderExecutedRaw: string;
}): string {
  const g = Math.round(params.grossProceedsUsd * 100) / 100;
  const f = Math.round(params.feesUsd * 100) / 100;
  return [
    params.holdingId,
    params.eventDate,
    String(params.quantity),
    g.toFixed(2),
    f.toFixed(2),
    params.firstOrderExecutedRaw.trim(),
  ].join('|');
}
