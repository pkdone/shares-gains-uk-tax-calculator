/**
 * Sanitises a holding ticker for use in download filenames (cross-platform).
 */
export function sanitizeHoldingSymbolForFilename(symbol: string): string {
  return symbol.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function buildComputationPackFilenameAllYears(params: {
  readonly holdingSymbol: string;
  readonly generatedDate: Date;
  readonly extension: '.json' | '.pdf';
}): string {
  const sym = sanitizeHoldingSymbolForFilename(params.holdingSymbol);
  const iso = params.generatedDate.toISOString().slice(0, 10);
  return `capital-gains-${sym}-all-tax-years-${iso}${params.extension}`;
}

export function buildComputationPackFilenameSingleTaxYear(params: {
  readonly holdingSymbol: string;
  readonly taxYearLabel: string;
  readonly generatedDate: Date;
  readonly extension: '.json' | '.pdf';
}): string {
  const sym = sanitizeHoldingSymbolForFilename(params.holdingSymbol);
  const ty = sanitizeHoldingSymbolForFilename(params.taxYearLabel);
  const iso = params.generatedDate.toISOString().slice(0, 10);
  return `capital-gains-${sym}-${ty}-tax-year-${iso}${params.extension}`;
}
