'use client';

import { useCallback, type ReactElement } from 'react';

import {
  buildComputationPackPdfAllYears,
} from '@/application/calculation/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import { buildComputationPackPdfFilenameAllYears } from '@/application/calculation/calculation-pdf-filename';

import { useCalculationPdfExportBusy } from '@/app/holdings/[holdingId]/calculation/calculation-pdf-export-context';
import { buttonPrimaryClassName } from '@/app/ui/button-variants';

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
    <div className="no-print flex w-full min-w-0 flex-wrap justify-end gap-4 lg:w-auto">
      <button
        type="button"
        className={`${buttonPrimaryClassName} shrink-0`}
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
