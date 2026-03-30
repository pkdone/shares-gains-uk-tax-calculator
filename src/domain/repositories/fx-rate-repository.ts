import type { FxRate } from '@/domain/schemas/fx-rate';

export interface FxRateRepository {
  findByDate(date: string): Promise<FxRate | null>;

  /** Most recent rate with `date` ≤ `onOrBefore` (ISO YYYY-MM-DD). */
  findLatestOnOrBefore(onOrBefore: string): Promise<FxRate | null>;

  upsertMany(rates: readonly FxRate[]): Promise<void>;
}
