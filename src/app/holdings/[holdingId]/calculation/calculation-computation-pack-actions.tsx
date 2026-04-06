'use client';

import { useCallback, type ReactElement } from 'react';

import { buildComputationPackPdfSingleTaxYear } from '@/application/calculation/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import { buildComputationPackPdfFilenameSingleTaxYear } from '@/application/calculation/calculation-pdf-filename';

import { useCalculationPdfExportBusy } from '@/app/holdings/[holdingId]/calculation/calculation-pdf-export-context';
import { CalculationTaxYearTabs } from '@/app/holdings/[holdingId]/calculation/calculation-tax-year-tabs';

type CalculationComputationPackActionsProps = {
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly holdingSymbol: string;
};

function downloadPdf(bytes: Uint8Array, filename: string): void {
  const bufferCopy = new Uint8Array(bytes.byteLength);
  bufferCopy.set(bytes);
  const blob = new Blob([bufferCopy], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CalculationComputationPackActions({
  groups,
  holdingSymbol,
}: CalculationComputationPackActionsProps): ReactElement {
  const { pdfBusy, setPdfBusy } = useCalculationPdfExportBusy();

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
      onExportThisTaxYear={handleExportThisTaxYear}
    />
  );
}
