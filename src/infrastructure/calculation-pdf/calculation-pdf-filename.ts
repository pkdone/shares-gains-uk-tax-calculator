import {
  buildComputationPackFilenameAllYears,
  buildComputationPackFilenameSingleTaxYear,
  sanitizeHoldingSymbolForFilename,
} from '@/infrastructure/calculation-export/calculation-export-filename';

export { sanitizeHoldingSymbolForFilename };

export function buildComputationPackPdfFilenameAllYears(params: {
  readonly holdingSymbol: string;
  readonly generatedDate: Date;
}): string {
  return buildComputationPackFilenameAllYears({ ...params, extension: '.pdf' });
}

export function buildComputationPackPdfFilenameSingleTaxYear(params: {
  readonly holdingSymbol: string;
  readonly taxYearLabel: string;
  readonly generatedDate: Date;
}): string {
  return buildComputationPackFilenameSingleTaxYear({ ...params, extension: '.pdf' });
}
