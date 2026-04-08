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

type CalculationExportContextValue = {
  readonly exportBusy: boolean;
  readonly setExportBusy: Dispatch<SetStateAction<boolean>>;
};

const CalculationExportContext = createContext<CalculationExportContextValue | null>(null);

export function CalculationExportProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [exportBusy, setExportBusy] = useState(false);
  const value = useMemo(
    (): CalculationExportContextValue => ({
      exportBusy,
      setExportBusy,
    }),
    [exportBusy],
  );

  return <CalculationExportContext.Provider value={value}>{children}</CalculationExportContext.Provider>;
}

export function useCalculationExportBusy(): CalculationExportContextValue {
  const ctx = useContext(CalculationExportContext);
  if (ctx === null) {
    throw new Error('useCalculationExportBusy must be used within CalculationExportProvider');
  }
  return ctx;
}
