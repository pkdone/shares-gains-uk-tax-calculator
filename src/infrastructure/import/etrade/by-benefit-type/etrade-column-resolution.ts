import {
  COLUMN_ALIASES,
  GRANTED_QTY_ALIASES,
  GRANT_DATE_ALIASES,
  GRANT_NUMBER_ALIASES,
  SELLABLE_QTY_ALIASES,
  VESTING_EVENT_DATE_ALIASES,
  VEST_PERIOD_ALIASES,
  type EtradeColumnKey,
} from './column-aliases';
import { createNormaliseHeaderKeyMemo, normaliseHeaderKey } from './normalise-header-key';
import type { EtradeColumnIndices } from './parse-result-types';

/** Max rows from the top of the sheet to scan for a header line. */
export const ETRADE_HEADER_SCAN_MAX_ROWS = 45;

/**
 * Resolves an optional column: aliases outer, columns inner, rightmost match wins (same strategy as
 * the required-column resolver — handles expanded layouts with duplicate header names).
 */
function resolveOptionalColumn(norm: readonly string[], aliases: readonly string[]): number {
  for (const a of aliases) {
    let last = -1;
    for (let i = 0; i < norm.length; i++) {
      if (norm[i] === a) {
        last = i;
      }
    }
    if (last >= 0) {
      return last;
    }
  }
  return -1;
}

/**
 * For Grant Date and Vest Date: prefer the **first** alias that has a column, and within that alias
 * take the **first** (leftmost) match — these are unique per layout, not duplicated like qty columns.
 */
function resolveFirstHeaderColumn(norm: readonly string[], aliases: readonly string[]): number {
  for (const a of aliases) {
    for (let i = 0; i < norm.length; i++) {
      if (norm[i] === a) {
        return i;
      }
    }
  }
  return -1;
}

export function findColumnIndicesWithAliases(
  headerRow: string[],
  normHeader: (raw: string) => string = normaliseHeaderKey,
): EtradeColumnIndices | null {
  const norm = headerRow.map((c) => normHeader(String(c)));

  const resolve = (key: EtradeColumnKey): number => {
    const aliases = COLUMN_ALIASES[key];
    for (const a of aliases) {
      let last = -1;
      for (let i = 0; i < norm.length; i++) {
        if (norm[i] === a) {
          last = i;
        }
      }
      if (last >= 0) {
        return last;
      }
    }
    return -1;
  };

  const rowKind = resolve('rowKind');
  const symbol = resolve('symbol');
  const grantDateCol = resolveFirstHeaderColumn(norm, GRANT_DATE_ALIASES);
  const vestingEventDateCol = resolveFirstHeaderColumn(norm, VESTING_EVENT_DATE_ALIASES);
  const vestDateFromAliases = resolve('vestDate');
  let vestDate = vestingEventDateCol;
  if (vestDate < 0) {
    vestDate = grantDateCol;
  }
  if (vestDate < 0) {
    vestDate = vestDateFromAliases;
  }
  const vestedQty = resolve('vestedQty');
  const sharesTradedForTaxes = resolve('sharesTradedForTaxes');
  const taxableGain = resolve('taxableGain');
  const benefitType = resolve('benefitType');

  if (
    rowKind < 0 ||
    symbol < 0 ||
    vestDate < 0 ||
    vestedQty < 0 ||
    sharesTradedForTaxes < 0 ||
    taxableGain < 0 ||
    benefitType < 0
  ) {
    return null;
  }

  return {
    rowKind,
    symbol,
    vestDate,
    vestedQty,
    sharesTradedForTaxes,
    taxableGain,
    benefitType,
    grantDateCol,
    sellableQty: resolveOptionalColumn(norm, SELLABLE_QTY_ALIASES),
    grantedQty: resolveOptionalColumn(norm, GRANTED_QTY_ALIASES),
    grantNumberCol: resolveOptionalColumn(norm, GRANT_NUMBER_ALIASES),
    vestPeriodCol: resolveOptionalColumn(norm, VEST_PERIOD_ALIASES),
  };
}

/**
 * Finds the first row (within {@link ETRADE_HEADER_SCAN_MAX_ROWS}) that contains all required columns.
 */
export function findEtradeByBenefitTypeHeaderRow(
  grid: readonly (readonly string[])[],
): { readonly headerRowIndex: number; readonly col: EtradeColumnIndices } | null {
  const memo = createNormaliseHeaderKeyMemo();
  const limit = Math.min(ETRADE_HEADER_SCAN_MAX_ROWS, grid.length);
  for (let r = 0; r < limit; r++) {
    const row = grid[r];
    if (row === undefined) {
      continue;
    }
    const headerRow = [...row].map((c) => String(c));
    if (headerRow.every((c) => memo(c) === '')) {
      continue;
    }
    const col = findColumnIndicesWithAliases(headerRow, memo);
    if (col !== null) {
      return { headerRowIndex: r, col };
    }
  }
  return null;
}
