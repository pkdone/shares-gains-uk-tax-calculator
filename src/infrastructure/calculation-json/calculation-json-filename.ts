import { sanitizeHoldingSymbolForFilename } from '@/infrastructure/calculation-pdf/calculation-pdf-filename';

export function buildComputationPackJsonFilenameAllYears(params: {
  readonly holdingSymbol: string;
  readonly generatedDate: Date;
}): string {
  const sym = sanitizeHoldingSymbolForFilename(params.holdingSymbol);
  const iso = params.generatedDate.toISOString().slice(0, 10);
  return `capital-gains-${sym}-all-tax-years-${iso}.json`;
}

export function buildComputationPackJsonFilenameSingleTaxYear(params: {
  readonly holdingSymbol: string;
  readonly taxYearLabel: string;
  readonly generatedDate: Date;
}): string {
  const sym = sanitizeHoldingSymbolForFilename(params.holdingSymbol);
  const ty = sanitizeHoldingSymbolForFilename(params.taxYearLabel);
  const iso = params.generatedDate.toISOString().slice(0, 10);
  return `capital-gains-${sym}-${ty}-tax-year-${iso}.json`;
}
