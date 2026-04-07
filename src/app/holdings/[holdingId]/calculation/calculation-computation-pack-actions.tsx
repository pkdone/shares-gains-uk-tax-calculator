'use client';

import { useCallback, type ReactElement } from 'react';

import {
  buildComputationPackPdfAllYears,
  buildComputationPackPdfSingleTaxYear,
} from '@/infrastructure/calculation-pdf/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import {
  buildComputationPackPdfFilenameAllYears,
  buildComputationPackPdfFilenameSingleTaxYear,
} from '@/infrastructure/calculation-pdf/calculation-pdf-filename';

import { useCalculationPdfExportBusy } from '@/app/holdings/[holdingId]/calculation/calculation-pdf-export-context';
import { CalculationTaxYearTabs } from '@/app/holdings/[holdingId]/calculation/calculation-tax-year-tabs';
import { downloadPdf } from '@/app/ui/download-pdf';

type CalculationComputationPackActionsProps = {
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly holdingSymbol: string;
};

export function CalculationComputationPackActions({
  groups,
  holdingSymbol,
}: CalculationComputationPackActionsProps): ReactElement {
  const { pdfBusy, setPdfBusy } = useCalculationPdfExportBusy();

  const handleExportAllYears = useCallback(() => {
    setPdfBusy(true);
    try {
      const generatedAt = new Date();
      const bytes = buildComputationPackPdfAllYears({
        holdingSymbol,
        groups,
        generatedAt,
      });
      downloadPdf(
        bytes,
        buildComputationPackPdfFilenameAllYears({ holdingSymbol, generatedDate: generatedAt }),
      );
    } finally {
      setPdfBusy(false);
    }
  }, [groups, holdingSymbol, setPdfBusy]);

  const handleExportThisTaxYear = useCallback(
    (group: CalculationTransactionTableGroup) => {
      setPdfBusy(true);
      try {
        const generatedAt = new Date();
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
          }),
        );
      } finally {
        setPdfBusy(false);
      }
    },
    [holdingSymbol, setPdfBusy],
  );

  return (
    <CalculationTaxYearTabs
      groups={groups}
      holdingSymbol={holdingSymbol}
      pdfBusy={pdfBusy}
      onExportAllYears={handleExportAllYears}
      onExportThisTaxYear={handleExportThisTaxYear}
    />
  );
}
