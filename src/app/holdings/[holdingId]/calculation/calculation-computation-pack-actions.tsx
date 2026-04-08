'use client';

import { useCallback, type ReactElement } from 'react';

import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import {
  buildComputationPackJsonAllYears,
  buildComputationPackJsonSingleTaxYear,
} from '@/infrastructure/calculation-json/build-calculation-computation-pack-json';
import {
  buildComputationPackJsonFilenameAllYears,
  buildComputationPackJsonFilenameSingleTaxYear,
} from '@/infrastructure/calculation-json/calculation-json-filename';
import {
  buildComputationPackPdfAllYears,
  buildComputationPackPdfSingleTaxYear,
} from '@/infrastructure/calculation-pdf/build-calculation-computation-pack-pdf';
import {
  buildComputationPackPdfFilenameAllYears,
  buildComputationPackPdfFilenameSingleTaxYear,
} from '@/infrastructure/calculation-pdf/calculation-pdf-filename';

import { useCalculationExportBusy } from '@/app/holdings/[holdingId]/calculation/calculation-export-context';
import type { ComputationPackExportFormat } from '@/app/holdings/[holdingId]/calculation/computation-pack-export-format';
import { CalculationTaxYearTabs } from '@/app/holdings/[holdingId]/calculation/calculation-tax-year-tabs';
import { downloadJson } from '@/app/ui/download-json';
import { downloadPdf } from '@/app/ui/download-pdf';

type CalculationComputationPackActionsProps = {
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly holdingSymbol: string;
};

export function CalculationComputationPackActions({
  groups,
  holdingSymbol,
}: CalculationComputationPackActionsProps): ReactElement {
  const { exportBusy, setExportBusy } = useCalculationExportBusy();

  const handleExportAllYears = useCallback(
    (format: ComputationPackExportFormat) => {
      setExportBusy(true);
      try {
        const generatedAt = new Date();
        if (format === 'pdf') {
          const bytes = buildComputationPackPdfAllYears({
            holdingSymbol,
            groups,
            generatedAt,
          });
          downloadPdf(
            bytes,
            buildComputationPackPdfFilenameAllYears({ holdingSymbol, generatedDate: generatedAt }),
          );
        } else {
          const bytes = buildComputationPackJsonAllYears({
            holdingSymbol,
            groups,
            generatedAt,
          });
          downloadJson(
            bytes,
            buildComputationPackJsonFilenameAllYears({ holdingSymbol, generatedDate: generatedAt }),
          );
        }
      } finally {
        setExportBusy(false);
      }
    },
    [groups, holdingSymbol, setExportBusy],
  );

  const handleExportThisTaxYear = useCallback(
    (group: CalculationTransactionTableGroup, format: ComputationPackExportFormat) => {
      setExportBusy(true);
      try {
        const generatedAt = new Date();
        if (format === 'pdf') {
          const bytes = buildComputationPackPdfSingleTaxYear({
            holdingSymbol,
            group,
            generatedAt,
          });
          downloadPdf(
            bytes,
            buildComputationPackPdfFilenameSingleTaxYear({
              holdingSymbol,
              taxYearLabel: group.taxYearLabel,
              generatedDate: generatedAt,
            }),
          );
        } else {
          const bytes = buildComputationPackJsonSingleTaxYear({
            holdingSymbol,
            group,
            generatedAt,
          });
          downloadJson(
            bytes,
            buildComputationPackJsonFilenameSingleTaxYear({
              holdingSymbol,
              taxYearLabel: group.taxYearLabel,
              generatedDate: generatedAt,
            }),
          );
        }
      } finally {
        setExportBusy(false);
      }
    },
    [holdingSymbol, setExportBusy],
  );

  return (
    <CalculationTaxYearTabs
      groups={groups}
      holdingSymbol={holdingSymbol}
      exportBusy={exportBusy}
      onExportAllYears={handleExportAllYears}
      onExportThisTaxYear={handleExportThisTaxYear}
    />
  );
}
