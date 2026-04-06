'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';

type CalculationPdfExportContextValue = {
  readonly pdfBusy: boolean;
  readonly setPdfBusy: Dispatch<SetStateAction<boolean>>;
};

const CalculationPdfExportContext = createContext<CalculationPdfExportContextValue | null>(null);

export function CalculationPdfExportProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [pdfBusy, setPdfBusy] = useState(false);
  const value = useMemo(
    (): CalculationPdfExportContextValue => ({
      pdfBusy,
      setPdfBusy,
    }),
    [pdfBusy],
  );

  return (
    <CalculationPdfExportContext.Provider value={value}>{children}</CalculationPdfExportContext.Provider>
  );
}

export function useCalculationPdfExportBusy(): CalculationPdfExportContextValue {
  const ctx = useContext(CalculationPdfExportContext);
  if (ctx === null) {
    throw new Error('useCalculationPdfExportBusy must be used within CalculationPdfExportProvider');
  }
  return ctx;
}
