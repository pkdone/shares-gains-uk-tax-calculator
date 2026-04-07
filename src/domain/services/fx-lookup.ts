import type { FxRate } from '@/domain/schemas/fx-rate';
import { DomainError } from '@/domain/errors/domain-error';

export type FxRateResolution = {
  readonly usdPerGbp: number;
  /** Calendar date of the BoE published rate used (may differ from the event date when using fallback). */
  readonly rateDateUsed: string;
  readonly usedFallback: boolean;
};

/**
 * Resolves XUDLUSS USD-per-GBP for an event date using a rate row with `date` ≤ event date.
 * Fallback is flagged when the published rate date differs from the event date (e.g. weekend/holiday).
 */
export function resolveUsdPerGbpFromLookup(params: {
  readonly eventDate: string;
  readonly rate: FxRate | null;
}): FxRateResolution {
  const { eventDate, rate } = params;
  if (rate === null) {
    throw new DomainError(
      `No Bank of England USD/GBP spot rate on or before ${eventDate}. Run npm run fetch:fx-rates (after db:init) or extend the downloaded date range.`,
    );
  }

  return {
    usdPerGbp: rate.usdPerGbp,
    rateDateUsed: rate.date,
    usedFallback: rate.date !== eventDate,
  };
}
