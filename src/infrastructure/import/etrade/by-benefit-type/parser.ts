import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';
import { shareAcquisitionImportUsdSchema } from '@/domain/schemas/share-acquisition';

import { tryParseSpreadsheetDateCell } from '@/domain/services/date-only-parse';

import { findEtradeByBenefitTypeHeaderRow } from './etrade-column-resolution';
import { createNormaliseHeaderKeyMemo } from './normalise-header-key';
import type { EtradeColumnIndices, EtradeParseIssue, EtradeParseResult } from './parse-result-types';

/** Match Tax rows to Vest Schedule rows when calendar dates differ slightly (e.g. month-end vs next month). */
const VEST_SCHEDULE_DATE_FUZZ_DAYS = 14;

/**
 * Parses numeric spreadsheet cells, including `$29,203.24` and plain numbers.
 */
export function parseNumberCell(raw: string): number | null {
  let s = raw.trim().replace(/,/gu, '');
  s = s.replace(/^\$/u, '').replace(/^£/u, '').replace(/^€/u, '').trim();
  if (s.length === 0) {
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Gross shares vested on this row: Vested Qty when present; otherwise Sellable + Withheld when the
 * sheet exposes both (expanded E*Trade layouts often leave Vested Qty blank on Tax Withholding).
 */
export function grossVestedQtyFromRowCells(
  col: EtradeColumnIndices,
  g: (i: number) => string,
): number | null {
  const direct = parseNumberCell(g(col.vestedQty));
  if (direct !== null && direct > 0) {
    return direct;
  }
  if (col.grantedQty >= 0) {
    const gq = parseNumberCell(g(col.grantedQty));
    if (gq !== null && gq > 0) {
      return gq;
    }
  }
  const traded = parseNumberCell(g(col.sharesTradedForTaxes)) ?? 0;
  if (col.sellableQty < 0) {
    return null;
  }
  const sellable = parseNumberCell(g(col.sellableQty));
  if (sellable !== null && sellable > 0) {
    return sellable + traded;
  }
  return null;
}

/** Normalises Record Type / row-kind cells (NBSP, collapse spaces) like {@link normaliseHeaderKey} lite. */
function normaliseRowKind(raw: string): string {
  return raw
    .replace(/\u00a0/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, ' ');
}

function isGrantRowKind(rowKind: string): boolean {
  const k = rowKind.trim().toLowerCase();
  if (k === 'grant') {
    return true;
  }
  return (
    k === 'new grant' ||
    k === 'initial grant' ||
    k === 'stock grant' ||
    k === 'rsu grant'
  );
}

/**
 * Normalises Symbol column text for vest schedule lookup keys (E*Trade sometimes qualifies tickers
 * with exchange or " US" suffixes).
 */
export function normaliseTickerForLookup(raw: string): string {
  let s = raw
    .replace(/\u00a0/gu, ' ')
    .trim()
    .toUpperCase()
    .replace(/\s+/gu, ' ');
  if (s.length === 0) {
    return s;
  }
  if (s.endsWith('.US')) {
    s = s.slice(0, -3).trim();
  }
  if (s.endsWith(' US') || s.endsWith('-US')) {
    s = s.slice(0, -3).trim();
  }
  const paren = s.indexOf('(');
  if (paren > 0) {
    s = s.slice(0, paren).trim();
  }
  if (s.includes(':')) {
    const tail = s.split(':').pop()?.trim() ?? s;
    if (/^[A-Z]{1,5}(?:\.[A-Z]+)?$/u.test(tail)) {
      s = tail.replace(/\.[A-Z]+$/u, '');
    }
  }
  const firstTok = s.split(/[\s/|]+/u)[0];
  if (firstTok !== undefined && /^[A-Z]{1,5}$/u.test(firstTok)) {
    return firstTok;
  }
  return s;
}

function isVestScheduleRowKind(rowKind: string): boolean {
  const k = rowKind;
  if (
    k === 'vest schedule' ||
    k === 'vesting schedule' ||
    k === 'vestschedule' ||
    k === 'vest' ||
    k === 'release schedule' ||
    k === 'vesting' ||
    k === 'vest event' ||
    k === 'vesting event' ||
    k === 'scheduled vest' ||
    k === 'restricted stock vest' ||
    k === 'rsu vest' ||
    k === 'stock vest' ||
    k === 'equity vest'
  ) {
    return true;
  }
  if (k.includes('vest') && k.includes('schedule')) {
    return true;
  }
  if (k.includes('divest')) {
    return false;
  }
  if (k.includes('investment')) {
    return false;
  }
  if (
    /\b(?:vest|vesting|vested)\b/u.test(k) &&
    !k.includes('tax') &&
    !k.includes('withhold') &&
    !k.includes('w/h')
  ) {
    return true;
  }
  return false;
}

function isTaxWithholdingRowKind(rowKind: string): boolean {
  const k = rowKind.trim().toLowerCase();
  if (k === 'tax withholding' || k === 'tax w/h' || k === 'tax wh') {
    return true;
  }
  return k.includes('withholding') && k.includes('tax');
}

/** Footer / summary row at the bottom of some exports (e.g. column A = "Totals"). */
function isTotalsRowKind(rowKind: string): boolean {
  const k = rowKind.trim().toLowerCase();
  return k === 'totals' || k === 'grand total' || k === 'report total';
}

/** End-of-block rows; not vest events and must not consume ordinal / context. */
function isSellableSharesRowKind(rowKind: string): boolean {
  const k = rowKind.trim().toLowerCase();
  return k === 'sellable shares' || (k.includes('sellable') && k.includes('share'));
}

function grantDateCellText(col: EtradeColumnIndices, g: (i: number) => string): string {
  if (col.grantDateCol >= 0) {
    return g(col.grantDateCol).trim();
  }
  return g(col.vestDate).trim();
}

/**
 * Pads short rows so cells in column T (Vest Date) etc. are addressable (SheetJS may omit trailing
 * empty cells when the row is sparse).
 */
function padGridToColumnIndices(
  grid: readonly (readonly string[])[],
  col: EtradeColumnIndices,
): string[][] {
  const idxs = [
    col.rowKind,
    col.symbol,
    col.vestDate,
    col.grantDateCol,
    col.vestedQty,
    col.sharesTradedForTaxes,
    col.taxableGain,
    col.benefitType,
    col.sellableQty,
    col.grantedQty,
    col.grantNumberCol,
    col.vestPeriodCol,
  ].filter((i) => i >= 0);
  const minWidth = idxs.length === 0 ? 0 : Math.max(...idxs) + 1;
  return grid.map((row) => {
    if (row.length >= minWidth) {
      return [...row];
    }
    const pad = Array.from({ length: minWidth - row.length }, () => '');
    return [...row, ...pad];
  });
}

/**
 * Whether this row contributes vest quantities / FMV for lookup and ordinal queues. Expanded
 * exports often use Record Types other than "Vest Schedule" (e.g. equity award activity, release).
 */
export function isVestDataRowForIndexing(
  rowKind: string,
  col: EtradeColumnIndices,
  g: (i: number) => string,
): boolean {
  if (isGrantRowKind(rowKind) || isTaxWithholdingRowKind(rowKind)) {
    return false;
  }
  if (isTotalsRowKind(rowKind) || isSellableSharesRowKind(rowKind)) {
    return false;
  }
  const benefitRaw = g(col.benefitType);
  if (shouldExcludeVestScheduleRowForBenefitType(benefitRaw)) {
    return false;
  }
  if (isVestScheduleRowKind(rowKind)) {
    return true;
  }
  if (rowKind.length === 0) {
    return false;
  }
  if (/\b(total|summary|subtotal|balance|header|footer)\b/u.test(rowKind)) {
    return false;
  }
  const gross = grossVestedQtyFromRowCells(col, g);
  return gross !== null && gross > 0;
}

/**
 * Picks the first cell in the row that parses as a calendar date (handles merged / misaligned exports).
 */
function findFirstIsoDateInRow(row: readonly string[]): string | null {
  for (let i = 0; i < row.length; i++) {
    const raw = String(row[i] ?? '').trim();
    if (raw.length === 0) {
      continue;
    }
    const iso = tryParseSpreadsheetDateCell(raw);
    if (iso !== null) {
      return iso;
    }
  }
  return null;
}

/**
 * Every calendar date parseable from the row (deduped). Used so Vest Schedule rows keyed only by
 * Grant Date still match Tax rows that use a vest/release date from another column in the same row.
 */
function findAllIsoDatesInRow(row: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < row.length; i++) {
    const raw = String(row[i] ?? '').trim();
    if (raw.length === 0) {
      continue;
    }
    const iso = tryParseSpreadsheetDateCell(raw);
    if (iso !== null && !seen.has(iso)) {
      seen.add(iso);
      out.push(iso);
    }
  }
  return out;
}

function latestIsoDate(isos: readonly string[]): string | null {
  if (isos.length === 0) {
    return null;
  }
  return isos.reduce((a, b) => (a < b ? b : a));
}

function isRsuBenefitType(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length === 0) {
    return false;
  }
  if (s.includes('espp')) {
    return false;
  }
  if (s.includes('stock option') || /\boption\b/u.test(s)) {
    return false;
  }
  if (s.includes('rsu') || s.includes('restricted stock')) {
    return true;
  }
  /** Equity Edge "settlement type" often uses `stock` for RSU/award stock settlements. */
  if (s === 'stock') {
    return true;
  }
  /** Cash / share settlement labels appear on RSU vest lines in expanded exports. */
  if (s === 'cash' || s === 'shares' || s === 'share') {
    return true;
  }
  return s.includes('restricted') && s.includes('stock');
}

/**
 * Vest Schedule rows may use Settlement Type `Cash` or `Shares` while Tax lines use `stock`. Only
 * exclude clearly non-RSU awards here; Tax rows still use {@link isRsuBenefitType}.
 */
function shouldExcludeVestScheduleRowForBenefitType(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length === 0) {
    return false;
  }
  if (s.includes('espp')) {
    return true;
  }
  if (s.includes('stock option') || /\boption\b/u.test(s)) {
    return true;
  }
  return false;
}

export type VestScheduleLookupEntry = {
  readonly vestedQty: number;
  readonly marketOrGain: number | null;
  /** From Vest Schedule row; Tax rows often omit this column. */
  readonly sharesTradedForTaxes: number | null;
};

/** Resolved from Vest Schedule via Grant Number + Vest Period (expanded E*Trade layouts). */
export type VestScheduleGrantPeriodEntry = VestScheduleLookupEntry & {
  readonly vestIso: string;
};

function normaliseGrantNumberForKey(raw: string): string {
  return raw.replace(/\u00a0/gu, ' ').trim().toUpperCase().replace(/\s+/gu, '');
}

function normaliseVestPeriodForKey(raw: string): string {
  const t = raw.replace(/\u00a0/gu, ' ').trim();
  if (t.length === 0) {
    return '';
  }
  const n = parseNumberCell(t);
  if (n !== null && Number.isFinite(n) && n >= 0) {
    return String(Math.trunc(n));
  }
  return t.toLowerCase();
}

/**
 * Stable key for Grant Number + Vest Period. When `carryGrant` / `carryPeriod` are set (forward-fill
 * from prior rows), uses them if the row’s cells are blank — Excel merged cells often omit repeats.
 */
export function grantPeriodLookupKey(
  col: EtradeColumnIndices,
  g: (i: number) => string,
  carryGrant = '',
  carryPeriod = '',
): string | null {
  if (col.grantNumberCol < 0 || col.vestPeriodCol < 0) {
    return null;
  }
  const gnCell = g(col.grantNumberCol).trim();
  const vpCell = g(col.vestPeriodCol).trim();
  const gnRaw = gnCell.length > 0 ? gnCell : carryGrant;
  const vpRaw = vpCell.length > 0 ? vpCell : carryPeriod;
  const gn = normaliseGrantNumberForKey(gnRaw);
  const vp = normaliseVestPeriodForKey(vpRaw);
  if (gn.length === 0 || vp.length === 0) {
    return null;
  }
  return `${gn}|${vp}`;
}

/**
 * Normalised grant number and vest period for storage and import upsert keys (expanded E*Trade rows).
 * Returns `null` when the sheet has no grant/period columns or either side is blank after carry-forward.
 */
export function resolvedGrantAndVestForStorage(
  col: EtradeColumnIndices,
  g: (i: number) => string,
  carryGrant: string,
  carryPeriod: string,
): { readonly grantNumber: string; readonly vestPeriod: string } | null {
  const key = grantPeriodLookupKey(col, g, carryGrant, carryPeriod);
  if (key === null) {
    return null;
  }
  const gnCell = col.grantNumberCol >= 0 ? g(col.grantNumberCol).trim() : '';
  const vpCell = col.vestPeriodCol >= 0 ? g(col.vestPeriodCol).trim() : '';
  const gnRaw = gnCell.length > 0 ? gnCell : carryGrant;
  const vpRaw = vpCell.length > 0 ? vpCell : carryPeriod;
  const grantNumber = normaliseGrantNumberForKey(gnRaw);
  const vestPeriod = normaliseVestPeriodForKey(vpRaw);
  if (grantNumber.length === 0 || vestPeriod.length === 0) {
    return null;
  }
  return { grantNumber, vestPeriod };
}

function isoDateToUtcMidnightMs(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  return Date.UTC(y, m, d);
}

/**
 * When an exact `symbol|vestDate` key is missing, finds the closest Vest Schedule entry for that
 * symbol within {@link VEST_SCHEDULE_DATE_FUZZ_DAYS} calendar days.
 */
export function findVestScheduleEntryFuzzy(
  lookup: ReadonlyMap<string, VestScheduleLookupEntry>,
  symbol: string,
  eventIso: string,
  maxDays: number,
): VestScheduleLookupEntry | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(eventIso)) {
    return null;
  }
  const prefix = `${normaliseTickerForLookup(symbol)}|`;
  const target = isoDateToUtcMidnightMs(eventIso);
  let best: { readonly diff: number; readonly entry: VestScheduleLookupEntry } | null = null;
  for (const [key, entry] of lookup.entries()) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const rest = key.slice(prefix.length);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(rest)) {
      continue;
    }
    const ms = isoDateToUtcMidnightMs(rest);
    const diffDays = Math.abs(ms - target) / 86400000;
    if (diffDays <= maxDays && (best === null || diffDays < best.diff)) {
      best = { diff: diffDays, entry };
    }
  }
  return best?.entry ?? null;
}

/**
 * Indexes Vest Schedule rows by `symbol|vestIso` and by `Grant Number|Vest Period` (expanded layouts).
 */
export function buildVestScheduleLookups(
  grid: readonly (readonly string[])[],
  headerRowIndex: number,
  col: EtradeColumnIndices,
): {
  readonly bySymbolDate: ReadonlyMap<string, VestScheduleLookupEntry>;
  readonly byGrantPeriod: ReadonlyMap<string, VestScheduleGrantPeriodEntry>;
} {
  const map = new Map<string, VestScheduleLookupEntry>();
  const grantPeriodMap = new Map<string, VestScheduleGrantPeriodEntry>();
  let grantSymbol: string | null = null;
  let lastGrantNumber = '';
  let lastVestPeriod = '';

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (row === undefined || row.every((c) => String(c).trim() === '')) {
      continue;
    }

    const g = (i: number): string => (row[i] === undefined ? '' : String(row[i]));
    const rowKind = normaliseRowKind(g(col.rowKind));

    if (isGrantRowKind(rowKind)) {
      const sym = g(col.symbol).trim();
      if (sym.length > 0) {
        grantSymbol = normaliseTickerForLookup(sym);
      }
      lastVestPeriod = '';
      if (col.grantNumberCol >= 0) {
        const gn = g(col.grantNumberCol).trim();
        if (gn.length > 0) {
          lastGrantNumber = gn;
        }
      }
      continue;
    }

    if (!isVestDataRowForIndexing(rowKind, col, g)) {
      continue;
    }

    const gnCell = col.grantNumberCol >= 0 ? g(col.grantNumberCol).trim() : '';
    const vpCell = col.vestPeriodCol >= 0 ? g(col.vestPeriodCol).trim() : '';
    const gpKey = grantPeriodLookupKey(col, g, lastGrantNumber, lastVestPeriod);
    if (gnCell.length > 0) {
      lastGrantNumber = gnCell;
    }
    if (vpCell.length > 0) {
      lastVestPeriod = vpCell;
    }

    const symbol = normaliseTickerForLookup(g(col.symbol).trim() || grantSymbol || '');
    if (symbol.length === 0) {
      continue;
    }

    let dateKeys = findAllIsoDatesInRow(row);
    if (dateKeys.length === 0) {
      const vd = tryParseSpreadsheetDateCell(g(col.vestDate).trim());
      if (vd !== null) {
        dateKeys = [vd];
      }
    }
    if (dateKeys.length === 0) {
      continue;
    }

    const grossVq = grossVestedQtyFromRowCells(col, g);
    if (grossVq === null || grossVq <= 0) {
      continue;
    }

    const mv = parseNumberCell(g(col.taxableGain));
    const marketOrGain = mv !== null && mv >= 0 ? mv : null;
    const tradedCell = parseNumberCell(g(col.sharesTradedForTaxes));
    const sharesTradedForTaxes =
      tradedCell !== null && tradedCell >= 0 ? tradedCell : null;
    const symKey = symbol;
    const entry: VestScheduleLookupEntry = {
      vestedQty: grossVq,
      marketOrGain,
      sharesTradedForTaxes,
    };
    for (const vestIso of dateKeys) {
      map.set(`${symKey}|${vestIso}`, entry);
    }

    if (gpKey !== null) {
      const vIso = latestIsoDate(dateKeys);
      if (vIso !== null && !grantPeriodMap.has(gpKey)) {
        grantPeriodMap.set(gpKey, {
          vestedQty: grossVq,
          marketOrGain,
          sharesTradedForTaxes,
          vestIso: vIso,
        });
      }
    }
  }

  return { bySymbolDate: map, byGrantPeriod: grantPeriodMap };
}

/**
 * Indexes every Vest Schedule row by `symbol|vestIso` so Tax Withholding rows can resolve
 * sparse "Vested Qty" / FMV even when Tax lines appear above the matching Vest Schedule in the file.
 */
export function buildVestScheduleLookup(
  grid: readonly (readonly string[])[],
  headerRowIndex: number,
  col: EtradeColumnIndices,
): ReadonlyMap<string, VestScheduleLookupEntry> {
  return buildVestScheduleLookups(grid, headerRowIndex, col).bySymbolDate;
}

/**
 * Collects Vest Schedule rows in file order within each Grant block, **without** requiring
 * parseable dates. Used to match Tax Withholding rows by **ordinal** (k-th distinct tax date →
 * k-th vest line) when date-keyed lookup is empty (e.g. vest dates in formats we still do not parse).
 */
export function buildVestScheduleQueuesByGrant(
  grid: readonly (readonly string[])[],
  headerRowIndex: number,
  col: EtradeColumnIndices,
): readonly (readonly VestScheduleLookupEntry[])[] {
  const queues: VestScheduleLookupEntry[][] = [];
  let queue: VestScheduleLookupEntry[] = [];
  let grantSymbol: string | null = null;

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (row === undefined || row.every((c) => String(c).trim() === '')) {
      continue;
    }

    const g = (i: number): string => (row[i] === undefined ? '' : String(row[i]));
    const rowKind = normaliseRowKind(g(col.rowKind));

    if (isGrantRowKind(rowKind)) {
      queues.push(queue);
      queue = [];
      const sym = g(col.symbol).trim();
      if (sym.length > 0) {
        grantSymbol = normaliseTickerForLookup(sym);
      }
      continue;
    }

    if (!isVestDataRowForIndexing(rowKind, col, g)) {
      continue;
    }

    const symbol = normaliseTickerForLookup(g(col.symbol).trim() || grantSymbol || '');
    if (symbol.length === 0) {
      continue;
    }

    const grossVq = grossVestedQtyFromRowCells(col, g);
    if (grossVq === null || grossVq <= 0) {
      continue;
    }

    const mv = parseNumberCell(g(col.taxableGain));
    const marketOrGain = mv !== null && mv >= 0 ? mv : null;
    const tradedCell = parseNumberCell(g(col.sharesTradedForTaxes));
    const sharesTradedForTaxes =
      tradedCell !== null && tradedCell >= 0 ? tradedCell : null;
    queue.push({ vestedQty: grossVq, marketOrGain, sharesTradedForTaxes });
  }

  queues.push(queue);
  return queues;
}

/**
 * Parses a grid from an E*Trade-style "By Benefit Type" sheet (header row may not be row 1).
 */
export function parseEtradeByBenefitTypeGrid(grid: readonly (readonly string[])[]): EtradeParseResult {
  const issues: EtradeParseIssue[] = [];

  if (grid.length < 2) {
    return {
      drafts: [],
      issues: [{ kind: 'error', message: 'Sheet has no data rows.' }],
    };
  }

  const found = findEtradeByBenefitTypeHeaderRow(grid);
  if (found === null) {
    const memoNorm = createNormaliseHeaderKeyMemo();
    const preview = grid
      .slice(0, 5)
      .map((row, i) => {
        const cells = [...row]
          .slice(0, 12)
          .map((c) => memoNorm(String(c)).slice(0, 40));
        return `Row ${String(i + 1)}: ${cells.filter((c) => c.length > 0).join(' | ') || '(empty)'}`;
      })
      .join('\n');
    return {
      drafts: [],
      issues: [
        {
          kind: 'error',
          message:
            'Could not find a header row with the required columns. Expected one row to contain seven logical fields (names vary by export), e.g. Record Type, Symbol, Grant/Vest/Release Date, Vested Qty, Withheld or Traded-for-tax Qty, Taxable Gain or Est. Market Value, Benefit or Settlement Type. Tip: use the "By Benefit Type" expanded XLSX with the Restricted Stock / RSU sheet.\n---\n' +
            preview,
        },
      ],
    };
  }

  const { headerRowIndex, col } = found;
  const paddedGrid = padGridToColumnIndices(grid, col);
  const { bySymbolDate: vestScheduleLookup, byGrantPeriod: vestScheduleByGrantPeriod } =
    buildVestScheduleLookups(paddedGrid, headerRowIndex, col);
  const vestQueuesByGrant = buildVestScheduleQueuesByGrant(paddedGrid, headerRowIndex, col);

  let grantSymbol: string | null = null;
  /** Forward-fill for merged Grant Number / Vest Period cells (same as {@link buildVestScheduleLookups}). */
  let lastGrantNumber = '';
  let lastVestPeriod = '';
  /** Count of Grant rows seen; indexes {@link vestQueuesByGrant} after each grant (queue for current block). */
  let grantsSeen = 0;
  /** Within the current grant block: distinct Tax `eventDate` → ordinal index into the vest queue. */
  let ordinalDateToK = new Map<string, number>();
  let nextOrdinalK = 0;
  /** Grant Date on the most recent Grant row (fallback when Tax rows have no date and no Vest Schedule yet). */
  let lastGrantDateIso: string | null = null;
  /** ISO `YYYY-MM-DD` from the latest Vest Schedule row (or null after a new Grant row). */
  let lastVestEventIso: string | null = null;
  /** From the most recent Vest Schedule row (expanded exports often leave Tax Withholding rows sparse). */
  let lastVestScheduleVestedQty: number | null = null;
  let lastVestScheduleMarketOrGain: number | null = null;
  /** Sell-to-cover / withheld shares; Tax rows often omit this column (see `sharesTradedForTaxes` on vest row). */
  let lastVestScheduleSharesTradedForTaxes: number | null = null;
  const drafts: ShareAcquisitionImportUsd[] = [];
  /** Collapses duplicate Tax Withholding lines per vest (e.g. NI + PAYE) and sparse rows without grant/vest. */
  const seenDraftKeys = new Set<string>();
  let excludedNonRsu = 0;
  let vestDateParseFailCount = 0;
  let vestedQtyParseFailCount = 0;

  for (let r = headerRowIndex + 1; r < paddedGrid.length; r++) {
    const row = paddedGrid[r];
    if (row === undefined || row.every((c) => String(c).trim() === '')) {
      continue;
    }

    const g = (i: number): string => (row[i] === undefined ? '' : String(row[i]));

    const rowKind = normaliseRowKind(g(col.rowKind));
    const benefitRaw = g(col.benefitType);

    if (isTotalsRowKind(rowKind) || isSellableSharesRowKind(rowKind)) {
      continue;
    }

    if (isGrantRowKind(rowKind)) {
      grantsSeen += 1;
      ordinalDateToK = new Map();
      nextOrdinalK = 0;
      const sym = g(col.symbol).trim();
      if (sym.length > 0) {
        grantSymbol = normaliseTickerForLookup(sym);
      }
      lastVestPeriod = '';
      if (col.grantNumberCol >= 0) {
        const gn = g(col.grantNumberCol).trim();
        if (gn.length > 0) {
          lastGrantNumber = gn;
        }
      }
      const grantDateCell = grantDateCellText(col, g);
      lastGrantDateIso =
        tryParseSpreadsheetDateCell(grantDateCell) ?? findFirstIsoDateInRow(row);
      lastVestEventIso = null;
      lastVestScheduleVestedQty = null;
      lastVestScheduleMarketOrGain = null;
      lastVestScheduleSharesTradedForTaxes = null;
      continue;
    }

    if (isVestDataRowForIndexing(rowKind, col, g)) {
      const gnCell = col.grantNumberCol >= 0 ? g(col.grantNumberCol).trim() : '';
      const vpCell = col.vestPeriodCol >= 0 ? g(col.vestPeriodCol).trim() : '';
      if (gnCell.length > 0) {
        lastGrantNumber = gnCell;
      }
      if (vpCell.length > 0) {
        lastVestPeriod = vpCell;
      }
      const allVestDates = findAllIsoDatesInRow(row);
      let vestIso = latestIsoDate(allVestDates);
      if (vestIso === null) {
        vestIso = tryParseSpreadsheetDateCell(g(col.vestDate).trim());
      }
      if (vestIso !== null) {
        lastVestEventIso = vestIso;
      }
      const vq = grossVestedQtyFromRowCells(col, g);
      if (vq !== null && vq > 0) {
        lastVestScheduleVestedQty = vq;
      }
      const mv = parseNumberCell(g(col.taxableGain));
      if (mv !== null && mv >= 0) {
        lastVestScheduleMarketOrGain = mv;
      }
      const stVest = parseNumberCell(g(col.sharesTradedForTaxes));
      lastVestScheduleSharesTradedForTaxes =
        stVest !== null && stVest >= 0 ? stVest : null;
      continue;
    }

    if (!isTaxWithholdingRowKind(rowKind)) {
      continue;
    }

    const benefitTrim = benefitRaw.trim();
    if (benefitTrim.length > 0 && !isRsuBenefitType(benefitTrim)) {
      excludedNonRsu += 1;
      continue;
    }

    const symbolRaw = g(col.symbol).trim() || grantSymbol || '';
    if (symbolRaw.length === 0) {
      issues.push({
        kind: 'error',
        message: 'Tax Withholding row has no symbol.',
        rowIndex: r + 1,
      });
      continue;
    }
    const symbol = normaliseTickerForLookup(symbolRaw);

    const gpKey = grantPeriodLookupKey(col, g, lastGrantNumber, lastVestPeriod);
    const gpVest = gpKey === null ? undefined : vestScheduleByGrantPeriod.get(gpKey);

    const primaryVest = g(col.vestDate).trim();
    const eventDate =
      tryParseSpreadsheetDateCell(primaryVest) ??
      lastVestEventIso ??
      gpVest?.vestIso ??
      lastGrantDateIso ??
      findFirstIsoDateInRow(row);
    if (eventDate === null) {
      vestDateParseFailCount += 1;
      if (vestDateParseFailCount <= 12) {
        issues.push({
          kind: 'error',
          message:
            `Row ${String(r + 1)}: no vest/release date found (primary date column empty and no date elsewhere on the row; also no prior Vest Schedule date in context).`,
          rowIndex: r + 1,
        });
      }
      continue;
    }

    const lookupKey = `${symbol}|${eventDate}`;
    const vestExact = vestScheduleLookup.get(lookupKey);
    const vestResolved =
      vestExact ??
      findVestScheduleEntryFuzzy(
        vestScheduleLookup,
        symbol,
        eventDate,
        VEST_SCHEDULE_DATE_FUZZ_DAYS,
      );

    const fromRowGross = grossVestedQtyFromRowCells(col, g);
    let vestedQty =
      fromRowGross ??
      lastVestScheduleVestedQty ??
      vestResolved?.vestedQty ??
      gpVest?.vestedQty ??
      null;
    const taxableGainCell = parseNumberCell(g(col.taxableGain));
    let taxableGain =
      taxableGainCell ??
      lastVestScheduleMarketOrGain ??
      vestResolved?.marketOrGain ??
      gpVest?.marketOrGain ??
      null;

    let ordinalVestEntry: VestScheduleLookupEntry | null = null;
    if (vestedQty === null || vestedQty <= 0) {
      const q = vestQueuesByGrant[grantsSeen];
      if (q !== undefined && q.length > 0) {
        let k = ordinalDateToK.get(eventDate);
        if (k === undefined) {
          k = nextOrdinalK;
          ordinalDateToK.set(eventDate, k);
          nextOrdinalK += 1;
        }
        const ordinalEntry = k < q.length ? q[k] : null;
        ordinalVestEntry = ordinalEntry;
        if (ordinalEntry !== null) {
          vestedQty = ordinalEntry.vestedQty;
          if (taxableGain === null && ordinalEntry.marketOrGain !== null) {
            taxableGain = ordinalEntry.marketOrGain;
          }
        }
      }
    }

    const tradedCell = parseNumberCell(g(col.sharesTradedForTaxes));
    let traded: number;
    if (tradedCell !== null && tradedCell >= 0) {
      traded = tradedCell;
    } else {
      const t =
        lastVestScheduleSharesTradedForTaxes ??
        vestExact?.sharesTradedForTaxes ??
        vestResolved?.sharesTradedForTaxes ??
        gpVest?.sharesTradedForTaxes ??
        ordinalVestEntry?.sharesTradedForTaxes ??
        null;
      traded = t !== null && t >= 0 ? t : 0;
    }

    if (vestedQty === null || vestedQty <= 0) {
      vestedQtyParseFailCount += 1;
      if (vestedQtyParseFailCount <= 12) {
        issues.push({
          kind: 'error',
          message: `Row ${String(r + 1)}: Tax Withholding has no Vested Qty and no Vest Schedule match for ${symbol} on ${eventDate}.`,
          rowIndex: r + 1,
        });
      }
      continue;
    }

    if (taxableGain === null || taxableGain < 0) {
      issues.push({
        kind: 'error',
        message:
          'Tax Withholding row has invalid market value / taxable amount (and no value inherited from a Vest Schedule row above).',
        rowIndex: r + 1,
      });
      continue;
    }

    const netQty = vestedQty - traded;
    if (netQty <= 0) {
      issues.push({
        kind: 'notice',
        message: `Row ${String(r + 1)}: net shares after tax withholding is not positive; skipped.`,
        rowIndex: r + 1,
      });
      continue;
    }

    const perShareUsd = taxableGain / vestedQty;
    const grossUsd = perShareUsd * netQty;

    const gv = resolvedGrantAndVestForStorage(col, g, lastGrantNumber, lastVestPeriod);
    const dedupeKey =
      gv === null
        ? `sparse|${symbol}|${eventDate}|${String(netQty)}|${grossUsd.toFixed(6)}`
        : `full|${symbol}|${eventDate}|${gv.grantNumber}|${gv.vestPeriod}`;
    if (seenDraftKeys.has(dedupeKey)) {
      continue;
    }

    const draft: ShareAcquisitionImportUsd = {
      economicsKind: 'import_usd',
      symbol,
      eventDate,
      quantity: netQty,
      grossVestedQuantity: vestedQty,
      sharesTradedForTaxes: traded,
      considerationUsd: grossUsd,
      feesUsd: 0,
      ...(gv === null ? {} : { grantNumber: gv.grantNumber, vestPeriod: gv.vestPeriod }),
    };

    const validated = shareAcquisitionImportUsdSchema.safeParse(draft);
    if (!validated.success) {
      issues.push({
        kind: 'error',
        message: `Row ${String(r + 1)}: ${validated.error.message}`,
        rowIndex: r + 1,
      });
      continue;
    }

    seenDraftKeys.add(dedupeKey);
    drafts.push(validated.data);
  }

  if (vestDateParseFailCount > 12) {
    issues.push({
      kind: 'error',
      message: `Could not determine a vest/release date for ${String(
        vestDateParseFailCount - 12,
      )} additional Tax Withholding row(s) (only the first 12 are listed above).`,
    });
  }

  if (vestedQtyParseFailCount > 12) {
    issues.push({
      kind: 'error',
      message: `Could not resolve Vested Qty for ${String(
        vestedQtyParseFailCount - 12,
      )} additional Tax Withholding row(s) (only the first 12 are listed above).`,
    });
  }

  if (excludedNonRsu > 0) {
    issues.push({
      kind: 'notice',
      message: `Excluded ${String(excludedNonRsu)} non-RSU benefit row(s) (e.g. options, ESPP).`,
    });
  }

  if (drafts.length === 0 && issues.every((i) => i.kind === 'notice')) {
    issues.unshift({
      kind: 'error',
      message: 'No RSU Tax Withholding rows produced acquisitions.',
    });
  }

  return { drafts, issues };
}
