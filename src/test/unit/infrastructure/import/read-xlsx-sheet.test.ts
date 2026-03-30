import { readFileSync } from 'fs';
import { resolve } from 'path';

import * as XLSX from 'xlsx';

import {
  applyMergedRegionsToGrid,
  readXlsxForEtradeByBenefitTypeImport,
} from '@/infrastructure/import/read-xlsx-sheet';
import { parseEtradeByBenefitTypeGrid } from '@/domain/services/etrade-by-benefit-type';

describe('applyMergedRegionsToGrid', () => {
  it('fills empty cells covered by merges with the top-left value', () => {
    const grid = [
      ['h0', 'h1', 'h2'],
      ['a', 'RU-9999', ''],
    ];
    const sheet: XLSX.WorkSheet = {
      '!merges': [{ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }],
    };
    const out = applyMergedRegionsToGrid(grid, sheet);
    expect(out.length).toBe(3);
    expect(out[1]?.[1]).toBe('RU-9999');
    expect(out[2]?.[1]).toBe('RU-9999');
  });

  it('reads master from sheet cell when grid anchor is empty', () => {
    const grid = [
      ['h0', 'h1'],
      ['a', ''],
    ];
    const addr = XLSX.utils.encode_cell({ r: 1, c: 1 });
    const sheet: XLSX.WorkSheet = {
      '!merges': [{ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }],
      [addr]: { v: 'RU-1000', t: 's' },
    };
    const out = applyMergedRegionsToGrid(grid, sheet);
    expect(out[2]?.[1]).toBe('RU-1000');
  });
});

describe('readXlsxSheetToGrid', () => {
  it('reads committed minimal By Benefit Type fixture', () => {
    const buf = readFileSync(
      resolve(process.cwd(), 'src/test/fixtures/import/minimal-by-benefit-type.xlsx'),
    );
    const grid = readXlsxForEtradeByBenefitTypeImport(buf);
    expect(grid.length).toBeGreaterThanOrEqual(2);
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    const errors = issues.filter((i) => i.kind === 'error');
    expect(errors.length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });
});
