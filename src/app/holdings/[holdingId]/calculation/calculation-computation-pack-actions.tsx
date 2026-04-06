'use client';

import { useCallback, useState, type ReactElement } from 'react';

import {
  buildComputationPackPdfAllYears,
  buildComputationPackPdfSingleTaxYear,
} from '@/application/calculation/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import {
  buildComputationPackPdfFilenameAllYears,
  buildComputationPackPdfFilenameSingleTaxYear,
} from '@/application/calculation/calculation-pdf-filename';

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

const exportButtonClassName =
  'rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50';

export function CalculationComputationPackActions({
  groups,
  holdingSymbol,
}: CalculationComputationPackActionsProps): ReactElement {
  const [pdfBusy, setPdfBusy] = useState(false);

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
  }, [groups, holdingSymbol]);

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
    [holdingSymbol],
  );

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={exportButtonClassName}
          disabled={groups.length === 0 || pdfBusy}
          aria-busy={pdfBusy}
          onClick={() => {
            handleExportAll();
          }}
        >
          Export all tax years (PDF)
        </button>
      </div>

      <CalculationTaxYearTabs
        groups={groups}
        holdingSymbol={holdingSymbol}
        pdfBusy={pdfBusy}
        onExportThisTaxYear={handleExportThisTaxYear}
      />
    </div>
  );
}
