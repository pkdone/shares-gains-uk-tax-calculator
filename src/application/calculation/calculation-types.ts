import type { CalcOutput } from '@/domain/schemas/calculation';

/** FX metadata for an `import_usd` acquisition used when building calculation input. */
export type FxAppliedToAcquisition = {
  readonly acquisitionId: string;
  readonly eventDate: string;
  /** XUDLUSS value (USD per 1 GBP). */
  readonly usdPerGbp: number;
  readonly rateDateUsed: string;
  readonly usedFallback: boolean;
};

export type SuccessfulHoldingCalculation = {
  readonly output: CalcOutput;
  /** Only `import_usd` acquisitions appear here. */
  readonly fxByAcquisitionId: Record<string, FxAppliedToAcquisition>;
  readonly warnings: readonly string[];
};
