import type { FxRate } from '@/domain/schemas/fx-rate';

export interface FxRateRepository {
  findByDate(date: string): Promise<FxRate | null>;

  /** Most recent rate with `date` ≤ `onOrBefore` (ISO YYYY-MM-DD). */
  findLatestOnOrBefore(onOrBefore: string): Promise<FxRate | null>;

  /**
   * Batch resolution of {@link findLatestOnOrBefore} for many dates (one DB round-trip).
   * Each key in the returned map is an input date string; the value is the same rate row
   * `findLatestOnOrBefore` would return for that date.
   */
  findLatestOnOrBeforeForDates(onOrBeforeDates: readonly string[]): Promise<ReadonlyMap<string, FxRate | null>>;

  upsertMany(rates: readonly FxRate[]): Promise<void>;
}
