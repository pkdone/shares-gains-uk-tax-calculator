import {
  buildComputationPackFilenameAllYears,
  buildComputationPackFilenameSingleTaxYear,
} from '@/infrastructure/calculation-export/calculation-export-filename';

export function buildComputationPackJsonFilenameAllYears(params: {
  readonly holdingSymbol: string;
  readonly generatedDate: Date;
}): string {
  return buildComputationPackFilenameAllYears({ ...params, extension: '.json' });
}

export function buildComputationPackJsonFilenameSingleTaxYear(params: {
  readonly holdingSymbol: string;
  readonly taxYearLabel: string;
  readonly generatedDate: Date;
}): string {
  return buildComputationPackFilenameSingleTaxYear({ ...params, extension: '.json' });
}
