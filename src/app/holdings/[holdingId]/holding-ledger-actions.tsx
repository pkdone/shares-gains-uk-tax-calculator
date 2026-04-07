'use client';

import { useCallback, useRef, useState } from 'react';

import { AcquisitionForm } from '@/app/holdings/[holdingId]/acquisition-form';
import { DisposalForm } from '@/app/holdings/[holdingId]/disposal-form';
import { EtradeImportSection } from '@/app/holdings/[holdingId]/etrade-import-section';
import { EtradePdfDisposalImportSection } from '@/app/holdings/[holdingId]/etrade-pdf-disposal-import-section';
import {
  buttonModalCloseClassName,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '@/app/ui/button-variants';

type HoldingLedgerActionsProps = {
  readonly holdingId: string;
  readonly holdingSymbol: string;
};

type ModalId = 'acquisition' | 'disposal' | 'import' | 'pdfImport';

export function HoldingLedgerActions({
  holdingId,
  holdingSymbol,
}: HoldingLedgerActionsProps): React.ReactElement {
  const acquisitionDialogRef = useRef<HTMLDialogElement>(null);
  const disposalDialogRef = useRef<HTMLDialogElement>(null);
  const importDialogRef = useRef<HTMLDialogElement>(null);
  const pdfImportDialogRef = useRef<HTMLDialogElement>(null);

  const closeAll = useCallback((): void => {
    acquisitionDialogRef.current?.close();
    disposalDialogRef.current?.close();
    importDialogRef.current?.close();
    pdfImportDialogRef.current?.close();
  }, []);

  const openModal = useCallback(
    (id: ModalId): void => {
      closeAll();
      if (id === 'acquisition') {
        setAcquisitionFormKey((k) => k + 1);
        acquisitionDialogRef.current?.showModal();
      } else if (id === 'disposal') {
        setDisposalFormKey((k) => k + 1);
        disposalDialogRef.current?.showModal();
      } else if (id === 'import') {
        importDialogRef.current?.showModal();
      } else {
        pdfImportDialogRef.current?.showModal();
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

  const closePdfImportModal = useCallback((): void => {
    pdfImportDialogRef.current?.close();
  }, []);

  const [etradeImportSectionKey, setEtradeImportSectionKey] = useState(0);
  const [etradePdfImportSectionKey, setEtradePdfImportSectionKey] = useState(0);
  const [acquisitionFormKey, setAcquisitionFormKey] = useState(0);
  const [disposalFormKey, setDisposalFormKey] = useState(0);

  const onImportCommitSuccess = useCallback((): void => {
    setEtradeImportSectionKey((k) => k + 1);
    closeImportModal();
  }, [closeImportModal]);

  const onPdfImportCommitSuccess = useCallback((): void => {
    setEtradePdfImportSectionKey((k) => k + 1);
    closePdfImportModal();
  }, [closePdfImportModal]);

  const onBackdropPointerDown = useCallback((event: React.PointerEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 gap-y-3">
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="sr-only">Add ledger entries</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonPrimaryClassName}
              onClick={() => {
                openModal('acquisition');
              }}
            >
              Add acquisition
            </button>
            <button
              type="button"
              className={buttonPrimaryClassName}
              onClick={() => {
                openModal('disposal');
              }}
            >
              Add disposal
            </button>
          </div>
        </fieldset>
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="sr-only">Import from files</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                openModal('import');
              }}
            >
              Import RSU acquisitions (XLSX)
            </button>
            <button
              type="button"
              className={buttonSecondaryClassName}
              onClick={() => {
                openModal('pdfImport');
              }}
            >
              Import RSU disposals (PDF)
            </button>
          </div>
        </fieldset>
      </div>

      <dialog
        ref={acquisitionDialogRef}
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="holding-modal-acquisition-title"
      >
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 id="holding-modal-acquisition-title" className="text-lg font-medium text-neutral-900">
              Add acquisition ({holdingSymbol})
            </h2>
            <button
              type="button"
              className={buttonModalCloseClassName}
              onClick={closeAcquisitionModal}
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-600">USD amounts; sterling conversion is on the calculation page.</p>
        </div>
        <div className="px-4 py-4">
          <AcquisitionForm
            key={acquisitionFormKey}
            holdingId={holdingId}
            holdingSymbol={holdingSymbol}
            onAfterSuccess={closeAcquisitionModal}
          />
        </div>
      </dialog>

      <dialog
        ref={disposalDialogRef}
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="holding-modal-disposal-title"
      >
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 id="holding-modal-disposal-title" className="text-lg font-medium text-neutral-900">
              Add disposal ({holdingSymbol})
            </h2>
            <button
              type="button"
              className={buttonModalCloseClassName}
              onClick={closeDisposalModal}
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
        </div>
        <div className="px-4 py-4">
          <DisposalForm
            key={disposalFormKey}
            holdingId={holdingId}
            holdingSymbol={holdingSymbol}
            onAfterSuccess={closeDisposalModal}
          />
        </div>
      </dialog>

      <dialog
        ref={importDialogRef}
        className="w-full max-w-4xl rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="holding-modal-import-title"
      >
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 id="holding-modal-import-title" className="text-lg font-medium text-neutral-900">
              Import RSU vesting ({holdingSymbol})
            </h2>
            <button
              type="button"
              className={buttonModalCloseClassName}
              onClick={closeImportModal}
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[min(80vh,720px)] overflow-y-auto px-4 py-4">
          <EtradeImportSection
            key={etradeImportSectionKey}
            holdingId={holdingId}
            holdingSymbol={holdingSymbol}
            layout="plain"
            onCommitSuccess={onImportCommitSuccess}
          />
        </div>
      </dialog>

      <dialog
        ref={pdfImportDialogRef}
        className="w-full max-w-4xl rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="holding-modal-pdf-import-title"
      >
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h2 id="holding-modal-pdf-import-title" className="text-lg font-medium text-neutral-900">
              Import RSU disposals — PDF ({holdingSymbol})
            </h2>
            <button
              type="button"
              className={buttonModalCloseClassName}
              onClick={closePdfImportModal}
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[min(80vh,720px)] overflow-y-auto px-4 py-4">
          <EtradePdfDisposalImportSection
            key={etradePdfImportSectionKey}
            holdingId={holdingId}
            holdingSymbol={holdingSymbol}
            layout="plain"
            onCommitSuccess={onPdfImportCommitSuccess}
          />
        </div>
      </dialog>
    </>
  );
}
