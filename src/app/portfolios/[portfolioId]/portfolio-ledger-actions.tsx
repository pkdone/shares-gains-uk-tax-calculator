'use client';

import { useCallback, useRef, useState } from 'react';

import { AcquisitionForm } from '@/app/portfolios/[portfolioId]/acquisition-form';
import { DisposalForm } from '@/app/portfolios/[portfolioId]/disposal-form';
import { EtradeImportSection } from '@/app/portfolios/[portfolioId]/etrade-import-section';

type PortfolioLedgerActionsProps = {
  readonly portfolioId: string;
};

type ModalId = 'acquisition' | 'disposal' | 'import';

export function PortfolioLedgerActions({
  portfolioId,
}: PortfolioLedgerActionsProps): React.ReactElement {
  const acquisitionDialogRef = useRef<HTMLDialogElement>(null);
  const disposalDialogRef = useRef<HTMLDialogElement>(null);
  const importDialogRef = useRef<HTMLDialogElement>(null);

  const closeAll = useCallback((): void => {
    acquisitionDialogRef.current?.close();
    disposalDialogRef.current?.close();
    importDialogRef.current?.close();
  }, []);

  const openModal = useCallback(
    (id: ModalId): void => {
      closeAll();
      if (id === 'acquisition') {
        acquisitionDialogRef.current?.showModal();
      } else if (id === 'disposal') {
        disposalDialogRef.current?.showModal();
      } else {
        importDialogRef.current?.showModal();
      }
    },
    [closeAll],
  );

  const closeAcquisitionModal = useCallback((): void => {
    acquisitionDialogRef.current?.close();
  }, []);

  const closeDisposalModal = useCallback((): void => {
    disposalDialogRef.current?.close();
  }, []);

  const closeImportModal = useCallback((): void => {
    importDialogRef.current?.close();
  }, []);

  const [etradeImportSectionKey, setEtradeImportSectionKey] = useState(0);

  const onImportCommitSuccess = useCallback((): void => {
    setEtradeImportSectionKey((k) => k + 1);
    closeImportModal();
  }, [closeImportModal]);

  const onBackdropPointerDown = useCallback((event: React.PointerEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  }, []);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          onClick={() => {
            openModal('import');
          }}
        >
          Import RSUs
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          onClick={() => {
            openModal('acquisition');
          }}
        >
          Add acquisition
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          onClick={() => {
            openModal('disposal');
          }}
        >
          Add disposal
        </button>
      </div>

      <dialog
        ref={acquisitionDialogRef}
        className="w-[min(100vw-2rem,32rem)] max-w-none rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="portfolio-modal-acquisition-title"
      >
        <div className="flex max-h-[min(85vh,40rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
            <h2 id="portfolio-modal-acquisition-title" className="text-lg font-medium text-neutral-900">
              Add acquisition
            </h2>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={closeAcquisitionModal}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto px-4 py-3">
            <p className="text-xs text-neutral-500">
              Amounts in USD. Total cost for display = consideration (before fees) + fees.
            </p>
            <div className="mt-4">
              <AcquisitionForm portfolioId={portfolioId} onAfterSuccess={closeAcquisitionModal} />
            </div>
          </div>
        </div>
      </dialog>

      <dialog
        ref={disposalDialogRef}
        className="w-[min(100vw-2rem,32rem)] max-w-none rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="portfolio-modal-disposal-title"
      >
        <div className="flex max-h-[min(85vh,40rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
            <h2 id="portfolio-modal-disposal-title" className="text-lg font-medium text-neutral-900">
              Add disposal
            </h2>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={closeDisposalModal}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto px-4 py-3">
            <p className="text-xs text-neutral-500">
              Amounts in USD. Net proceeds for display = gross proceeds − fees.
            </p>
            <div className="mt-4">
              <DisposalForm portfolioId={portfolioId} onAfterSuccess={closeDisposalModal} />
            </div>
          </div>
        </div>
      </dialog>

      <dialog
        ref={importDialogRef}
        className="w-[min(100vw-2rem,42rem)] max-w-none rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="portfolio-modal-import-title"
      >
        <div className="flex max-h-[min(90vh,48rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
            <h2 id="portfolio-modal-import-title" className="text-lg font-medium text-neutral-900">
              Import RSU vesting (E*Trade By Benefit Type)
            </h2>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={closeImportModal}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto px-4 py-3">
            <EtradeImportSection
              key={etradeImportSectionKey}
              portfolioId={portfolioId}
              layout="plain"
              onCommitSuccess={onImportCommitSuccess}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
