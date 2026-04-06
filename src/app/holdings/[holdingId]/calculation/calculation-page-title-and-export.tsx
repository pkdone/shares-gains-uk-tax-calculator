'use client';

import { useCallback, type ReactElement } from 'react';

import {
  buildComputationPackPdfAllYears,
} from '@/application/calculation/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import { buildComputationPackPdfFilenameAllYears } from '@/application/calculation/calculation-pdf-filename';

import { useCalculationPdfExportBusy } from '@/app/holdings/[holdingId]/calculation/calculation-pdf-export-context';

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

const exportButtonClassName =
  'rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50';

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
        className={`${exportButtonClassName} shrink-0`}
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
