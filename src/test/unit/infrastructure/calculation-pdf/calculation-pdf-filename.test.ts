import {
  buildComputationPackPdfFilenameAllYears,
  buildComputationPackPdfFilenameSingleTaxYear,
  sanitizeHoldingSymbolForFilename,
} from '@/infrastructure/calculation-pdf/calculation-pdf-filename';

describe('sanitizeHoldingSymbolForFilename', () => {
  it('passes through safe characters', () => {
    expect(sanitizeHoldingSymbolForFilename('MDB')).toBe('MDB');
    expect(sanitizeHoldingSymbolForFilename('BRK.B')).toBe('BRK.B');
  });

  it('replaces unsafe characters with underscores', () => {
    expect(sanitizeHoldingSymbolForFilename('FOO/BAR')).toBe('FOO_BAR');
    expect(sanitizeHoldingSymbolForFilename('A B')).toBe('A_B');
  });
});

describe('buildComputationPackPdfFilenameSingleTaxYear', () => {
  it('includes canonical tax year label and ISO date from generatedDate', () => {
    const d = new Date('2026-04-06T12:00:00.000Z');
    expect(
      buildComputationPackPdfFilenameSingleTaxYear({
        holdingSymbol: 'MDB',
        taxYearLabel: '2024-25',
        generatedDate: d,
      }),
    ).toBe('capital-gains-MDB-2024-25-tax-year-2026-04-06.pdf');
  });
});

describe('buildComputationPackPdfFilenameAllYears', () => {
  it('includes symbol and ISO date prefix from generatedDate', () => {
    const d = new Date('2026-04-06T12:00:00.000Z');
    expect(buildComputationPackPdfFilenameAllYears({ holdingSymbol: 'MDB', generatedDate: d })).toBe(
      'capital-gains-MDB-all-tax-years-2026-04-06.pdf',
    );
  });
});
