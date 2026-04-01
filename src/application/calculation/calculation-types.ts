import type { CalcOutput } from '@/domain/schemas/calculation';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';

/** FX metadata for an `import_usd` acquisition used when building calculation input. */
export type FxAppliedToAcquisition = {
  readonly acquisitionId: string;
  readonly eventDate: string;
  /** XUDLUSS value (USD per 1 GBP). */
  readonly usdPerGbp: number;
  readonly rateDateUsed: string;
  readonly usedFallback: boolean;
};

/** FX metadata for a disposal (USD economics converted at event date). */
export type FxAppliedToDisposal = {
  readonly disposalId: string;
  readonly eventDate: string;
  /** XUDLUSS value (USD per 1 GBP). */
  readonly usdPerGbp: number;
  readonly rateDateUsed: string;
  readonly usedFallback: boolean;
};

export type AcquisitionSterlingLine = {
  readonly grossConsiderationGbp: number;
  readonly feesGbp: number;
  readonly totalCostGbp: number;
};

export type DisposalSterlingLine = {
  readonly grossProceedsGbp: number;
  readonly feesGbp: number;
};

export type CalculationLedgerLine =
  | { readonly kind: 'ACQUISITION'; readonly data: ShareAcquisition }
  | { readonly kind: 'DISPOSAL'; readonly data: ShareDisposal };

export type SuccessfulHoldingCalculation = {
  readonly output: CalcOutput;
  /** Ledger lines for this holding symbol, sorted for display (date, kind, id). */
  readonly ledgerLines: readonly CalculationLedgerLine[];
  /** Sterling per acquisition row (same conversion as the calculation engine). */
  readonly sterlingByAcquisitionId: Record<string, AcquisitionSterlingLine>;
  /** Sterling per disposal row (same conversion as the calculation engine). */
  readonly sterlingByDisposalId: Record<string, DisposalSterlingLine>;
  /** Only `import_usd` acquisitions appear here. */
  readonly fxByAcquisitionId: Record<string, FxAppliedToAcquisition>;
  /** FX metadata for every disposal (USD converted at event date). */
  readonly fxByDisposalId: Record<string, FxAppliedToDisposal>;
  readonly warnings: readonly string[];
};
