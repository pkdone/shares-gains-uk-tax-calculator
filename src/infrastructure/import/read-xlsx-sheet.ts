import ExcelJS from 'exceljs';

import { findEtradeByBenefitTypeHeaderRow } from '@/infrastructure/import/etrade/by-benefit-type';
import { tryParseSpreadsheetDateCell } from '@/domain/services/date-only-parse';
import { ImportError } from '@/shared/errors/app-error';

const PREFERRED_SHEET = 'Restricted Stock';

/** Hard limits to mitigate zip-bomb style XLSX expansion (XLSX is a ZIP of XML). */
export const XLSX_IMPORT_MAX_BYTES = 4 * 1024 * 1024;
const MAX_GRID_ROWS = 50_000;
const MAX_GRID_COLS = 512;

type WorksheetWithMerges = ExcelJS.Worksheet & {
  readonly _merges: Record<string, ExcelJS.Range>;
};

/** Prefer Excel display text, then normalise raw value (numbers, Excel serial dates). */
function cellDisplayString(cell: ExcelJS.Cell): string {
  const text = cell.text?.trim();
  if (text !== undefined && text.length > 0) {
    return text;
  }
  return cellToGridStringFromRaw(cell.value);
}

/**
 * Replicates Excel merged cells: only the top-left cell stores the value; other covered cells are empty.
 * Fills those cells with the master value so downstream parsers see the same text as in Excel.
 *
 * Exported for unit tests.
 */
export function applyMergedRegionsToGrid(grid: string[][], sheet: ExcelJS.Worksheet): string[][] {
  const ws = sheet as WorksheetWithMerges;
  const merges = ws._merges;
  if (merges === undefined || Object.keys(merges).length === 0) {
    return grid;
  }

  let maxR = grid.length;
  let maxC = 0;
  for (const row of grid) {
    maxC = Math.max(maxC, row.length);
  }

  for (const dimensions of Object.values(merges)) {
    maxR = Math.max(maxR, dimensions.bottom);
    maxC = Math.max(maxC, dimensions.right);
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

  const readSheetCellDisplay = (excelRow: number, excelCol: number): string => {
    const cell = sheet.getCell(excelRow, excelCol);
    return cellDisplayString(cell).trim();
  };

  for (const dimensions of Object.values(merges)) {
    const r0 = dimensions.top;
    const c0 = dimensions.left;
    const r1 = dimensions.bottom;
    const c1 = dimensions.right;
    const topRow = out[r0 - 1];
    let master = '';
    if (topRow !== undefined && topRow[c0 - 1] !== undefined) {
      master = String(topRow[c0 - 1]).trim();
    }
    if (master.length === 0) {
      master = readSheetCellDisplay(r0, c0);
    }
    if (master.length === 0) {
      continue;
    }
    for (let r = r0; r <= r1; r++) {
      const row = out[r - 1];
      if (row === undefined) {
        continue;
      }
      for (let c = c0; c <= c1; c++) {
        const cur = row[c - 1];
        if (cur === undefined || String(cur).trim() === '') {
          row[c - 1] = master;
        }
      }
    }
  }

  return out;
}

function sheetToJsonRows(sheet: ExcelJS.Worksheet, useFormattedText: boolean): unknown[][] {
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const line: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (line.length < colNumber) {
        line.push('');
      }
      line[colNumber - 1] = useFormattedText ? cellDisplayString(cell) : cell.value;
    });
    rows.push(line);
  });
  return rows;
}

function sheetToGrid(sheet: ExcelJS.Worksheet | undefined): string[][] {
  if (sheet === undefined) {
    return [];
  }

  const rawRows = sheetToJsonRows(sheet, false);
  const fmtRows = sheetToJsonRows(sheet, true);

  const maxR = Math.max(rawRows.length, fmtRows.length);
  const merged: string[][] = [];
  for (let r = 0; r < maxR; r++) {
    const rawRow = rawRows[r] ?? [];
    const fmtRow = fmtRows[r] ?? [];
    const maxC = Math.max(rawRow.length, fmtRow.length);
    if (maxC > MAX_GRID_COLS) {
      throw new ImportError(`Spreadsheet row ${r + 1} exceeds maximum width (${MAX_GRID_COLS} columns)`);
    }
    const out: string[] = [];
    for (let c = 0; c < maxC; c++) {
      const a = cellToGridStringFromRaw(rawRow[c]);
      const b =
        typeof fmtRow[c] === 'string'
          ? (fmtRow[c] as string)
          : cellToGridStringFromRaw(fmtRow[c]);
      out.push(b.length > 0 ? b : a);
    }
    merged.push(out);
  }

  if (merged.length > MAX_GRID_ROWS) {
    throw new ImportError(`Spreadsheet exceeds maximum row count (${MAX_GRID_ROWS})`);
  }

  return applyMergedRegionsToGrid(merged, sheet);
}

function cellToGridStringFromRaw(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '';
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const iso = tryParseSpreadsheetDateCell(String(raw));
    if (iso !== null) {
      return iso;
    }
    return String(raw);
  }
  if (typeof raw === 'boolean') {
    return raw ? 'TRUE' : 'FALSE';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'bigint') {
    return String(raw);
  }
  return '';
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  if (buffer.length > XLSX_IMPORT_MAX_BYTES) {
    throw new ImportError(
      `Excel file is too large (max ${XLSX_IMPORT_MAX_BYTES} bytes). Try exporting a smaller range from your broker.`,
    );
  }

  const wb = new ExcelJS.Workbook();
  // ExcelJS `load` is typed against Node's `Buffer`; the workspace TypeScript lib can surface a distinct `Buffer` generic.
  // @ts-expect-error — keep runtime `Buffer` from file upload; types disagree between exceljs and @types/node.
  await wb.xlsx.load(buffer);
  return wb;
}

/**
 * Reads the first worksheet (preferring sheet name `Restricted Stock`) into a string grid for domain parsing.
 */
export async function readXlsxSheetToGrid(buffer: Buffer): Promise<string[][]> {
  const wb = await loadWorkbook(buffer);
  const names = wb.worksheets.map((ws) => ws.name);
  if (names.length === 0) {
    throw new ImportError('Workbook has no sheets');
  }

  const sheetName = names.includes(PREFERRED_SHEET) ? PREFERRED_SHEET : names[0];
  const sheet = wb.getWorksheet(sheetName ?? '');
  return sheetToGrid(sheet);
}

/**
 * Reads every worksheet that contains a recognisable By Benefit Type header (see
 * {@link findEtradeByBenefitTypeHeaderRow}) and **merges** them into one grid: the first matching
 * sheet is included in full; each additional matching sheet contributes only **data rows** (rows
 * after its header row). This matches workbooks where vest lines live on one tab and tax lines on
 * another with the same column layout.
 */
export async function readXlsxForEtradeByBenefitTypeImport(buffer: Buffer): Promise<string[][]> {
  const wb = await loadWorkbook(buffer);
  const names = wb.worksheets.map((ws) => ws.name);
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
    const grid = sheetToGrid(wb.getWorksheet(name));
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

  return sheetToGrid(wb.getWorksheet(orderedNames[0] ?? names[0] ?? ''));
}
