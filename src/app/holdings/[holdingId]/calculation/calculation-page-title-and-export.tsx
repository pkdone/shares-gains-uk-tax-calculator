'use client';

import { useCallback, type ReactElement } from 'react';

import {
  buildComputationPackPdfAllYears,
} from '@/application/calculation/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import { buildComputationPackPdfFilenameAllYears } from '@/application/calculation/calculation-pdf-filename';

import { useCalculationPdfExportBusy } from '@/app/holdings/[holdingId]/calculation/calculation-pdf-export-context';
import { buttonSecondaryClassName } from '@/app/ui/button-variants';

type CalculationPageTitleAndExportProps = {
  readonly holdingSymbol: string;
  readonly groups: readonly CalculationTransactionTableGroup[];
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

export function CalculationPageTitleAndExport({
  holdingSymbol,
  groups,
}: CalculationPageTitleAndExportProps): ReactElement {
  const { pdfBusy, setPdfBusy } = useCalculationPdfExportBusy();

  const handleExportAll = useCallback(() => {
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

  return (
    <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Capital gains calculations for {holdingSymbol} holding
      </h1>
      <button
        type="button"
        className={`${buttonSecondaryClassName} shrink-0 px-3 py-2 text-sm`}
        disabled={groups.length === 0 || pdfBusy}
        aria-busy={pdfBusy}
        onClick={() => {
          handleExportAll();
        }}
      >
        Export all tax years (PDF)
      </button>
    </div>
  );
}
