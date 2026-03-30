import * as XLSX from 'xlsx';

import { findEtradeByBenefitTypeHeaderRow } from '@/domain/services/etrade-by-benefit-type';
import { tryParseSpreadsheetDateCell } from '@/domain/services/date-only-parse';
import { ImportError } from '@/shared/errors/app-error';

const PREFERRED_SHEET = 'Restricted Stock';

/**
 * Converts a sheet cell to the string grid format the domain parser expects.
 * Prefer formatted values: `sheet_to_json` with `raw: false` uses Excel display strings and cached
 * formula results; `raw: true` often yields empty cells for unevaluated formulas in exported files.
 * Numbers still pass through for edge cases; date serials are normalised to ISO when applicable.
 */
function cellToGridString(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (typeof cell === 'number' && Number.isFinite(cell)) {
    const iso = tryParseSpreadsheetDateCell(String(cell));
    if (iso !== null) {
      return iso;
    }
    return String(cell);
  }
  if (typeof cell === 'boolean') {
    return cell ? 'TRUE' : 'FALSE';
  }
  if (typeof cell === 'string') {
    return cell;
  }
  if (typeof cell === 'bigint') {
    return String(cell);
  }
  return '';
}

/**
 * Replicates Excel merged cells: only the top-left cell is stored in the worksheet; SheetJS
 * `sheet_to_json` leaves other covered cells empty. Fills those cells with the master value so
 * downstream parsers see the same text as in Excel (Grant Number, Vest Period, quantities, etc.).
 *
 * Exported for unit tests.
 */
export function applyMergedRegionsToGrid(grid: string[][], sheet: XLSX.WorkSheet): string[][] {
  const merges = sheet['!merges'];
  if (merges === undefined || merges.length === 0) {
    return grid;
  }

  let maxR = grid.length;
  let maxC = 0;
  for (const row of grid) {
    maxC = Math.max(maxC, row.length);
  }
  for (const m of merges) {
    maxR = Math.max(maxR, m.e.r + 1);
    maxC = Math.max(maxC, m.e.c + 1);
  }

  const out: string[][] = [];
  for (let r = 0; r < maxR; r++) {
    const src = grid[r];
    const row = src === undefined ? [] : [...src];
    while (row.length < maxC) {
      row.push('');
    }
    out.push(row);
  }

  const readSheetCellDisplay = (r: number, c: number): string => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const rawCell: unknown = (sheet as Record<string, unknown>)[addr];
    if (rawCell === undefined || rawCell === null || typeof rawCell !== 'object') {
      return '';
    }
    const cellObj = rawCell as { v?: unknown; w?: string };
    if (cellObj.w !== undefined && String(cellObj.w).trim().length > 0) {
      return String(cellObj.w);
    }
    return cellToGridString(cellObj.v);
  };

  for (const m of merges) {
    const r0 = m.s.r;
    const c0 = m.s.c;
    const r1 = m.e.r;
    const c1 = m.e.c;
    const topRow = out[r0];
    let master = '';
    if (topRow !== undefined && topRow[c0] !== undefined) {
      master = String(topRow[c0]).trim();
    }
    if (master.length === 0) {
      master = readSheetCellDisplay(r0, c0).trim();
    }
    if (master.length === 0) {
      continue;
    }
    for (let r = r0; r <= r1; r++) {
      const row = out[r];
      if (row === undefined) {
        continue;
      }
      for (let c = c0; c <= c1; c++) {
        const cur = row[c];
        if (cur === undefined || String(cur).trim() === '') {
          row[c] = master;
        }
      }
    }
  }

  return out;
}

function rowToUnknownArray(row: unknown): unknown[] {
  if (!Array.isArray(row)) {
    return [];
  }
  const out: unknown[] = [];
  for (let c = 0; c < row.length; c++) {
    out.push(row[c] as unknown);
  }
  return out;
}

function sheetToJsonRows(sheet: XLSX.WorkSheet, raw: boolean): unknown[][] {
  const opts = { header: 1, defval: '' } as const;
  const parsed: unknown = XLSX.utils.sheet_to_json(sheet, { ...opts, raw });
  if (!Array.isArray(parsed)) {
    return [];
  }
  const rows: unknown[][] = [];
  for (let r = 0; r < parsed.length; r++) {
    rows.push(rowToUnknownArray(parsed[r] as unknown));
  }
  return rows;
}

function sheetToGrid(sheet: XLSX.WorkSheet | undefined): string[][] {
  if (sheet === undefined) {
    return [];
  }

  const rawRows = sheetToJsonRows(sheet, true);
  const fmtRows = sheetToJsonRows(sheet, false);

  const maxR = Math.max(rawRows.length, fmtRows.length);
  const merged: string[][] = [];
  for (let r = 0; r < maxR; r++) {
    const rawRow = rawRows[r] ?? [];
    const fmtRow = fmtRows[r] ?? [];
    const maxC = Math.max(rawRow.length, fmtRow.length);
    const out: string[] = [];
    for (let c = 0; c < maxC; c++) {
      const a = cellToGridString(rawRow[c]);
      const b = cellToGridString(fmtRow[c]);
      out.push(b.length > 0 ? b : a);
    }
    merged.push(out);
  }

  return applyMergedRegionsToGrid(merged, sheet);
}

/**
 * Reads the first worksheet (preferring sheet name `Restricted Stock`) into a string grid for domain parsing.
 */
export function readXlsxSheetToGrid(buffer: Buffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const names = wb.SheetNames;
  if (names.length === 0) {
    throw new ImportError('Workbook has no sheets');
  }

  const sheetName = names.includes(PREFERRED_SHEET) ? PREFERRED_SHEET : names[0];
  const sheet = wb.Sheets[sheetName ?? ''];
  return sheetToGrid(sheet);
}

/**
 * Reads every worksheet that contains a recognisable By Benefit Type header (see
 * {@link findEtradeByBenefitTypeHeaderRow}) and **merges** them into one grid: the first matching
 * sheet is included in full; each additional matching sheet contributes only **data rows** (rows
 * after its header row). This matches workbooks where vest lines live on one tab and tax lines on
 * another with the same column layout.
 */
export function readXlsxForEtradeByBenefitTypeImport(buffer: Buffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const names = wb.SheetNames;
  if (names.length === 0) {
    throw new ImportError('Workbook has no sheets');
  }

  const orderedNames = [
    ...names.filter((n) => n === PREFERRED_SHEET),
    ...names.filter((n) => n !== PREFERRED_SHEET),
  ];

  const merged: string[][] = [];
  let firstMatchingSheet = true;
  for (const name of orderedNames) {
    const grid = sheetToGrid(wb.Sheets[name]);
    if (grid.length === 0) {
      continue;
    }
    const found = findEtradeByBenefitTypeHeaderRow(grid);
    if (found === null) {
      continue;
    }
    const hr = found.headerRowIndex;
    if (firstMatchingSheet) {
      merged.push(...grid);
      firstMatchingSheet = false;
    } else {
      merged.push(...grid.slice(hr + 1));
    }
  }

  if (merged.length > 0) {
    return merged;
  }

  return sheetToGrid(wb.Sheets[orderedNames[0] ?? names[0] ?? '']);
}
