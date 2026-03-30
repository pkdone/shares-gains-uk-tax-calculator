import type { RateTier } from '@/domain/schemas/calculation';
import { DomainError } from '@/shared/errors/app-error';

/**
 * Disposals on or after this date use the post–30 Oct 2024 main CGT rates for shares
 * (see PRD Appendix 1). Compare ISO date-only strings (YYYY-MM-DD).
 */
export const CGT_MAIN_RATE_CHANGE_DATE = '2024-10-30';

/**
 * Annual exempt amount (GBP) for individuals by UK tax year label (`YYYY-YY` start year).
 * Source: PRD Appendix 1 (2016–17 onward).
 */
export function getAeaGbpForTaxYearLabel(taxYearLabel: string): number {
  const match = /^(\d{4})-\d{2}$/.exec(taxYearLabel);
  if (!match) {
    throw new DomainError('Expected tax year label like 2023-24');
  }

  const startYear = Number(match[1]);
  if (!Number.isFinite(startYear)) {
    throw new DomainError('Invalid tax year label');
  }

  if (startYear < 2016) {
    throw new DomainError(`AEA not modelled for tax years before 2016-17 (got ${taxYearLabel})`);
  }

  if (startYear === 2016) {
    return 11_100;
  }

  if (startYear === 2017) {
    return 11_300;
  }

  if (startYear === 2018) {
    return 11_700;
  }

  if (startYear === 2019) {
    return 12_000;
  }

  if (startYear >= 2020 && startYear <= 2022) {
    return 12_300;
  }

  if (startYear === 2023) {
    return 6000;
  }

  if (startYear >= 2024) {
    return 3000;
  }

  throw new DomainError(`AEA not defined for tax year ${taxYearLabel}`);
}

/**
 * Main CGT rate for share disposals (%), before or on/after {@link CGT_MAIN_RATE_CHANGE_DATE}.
 * `additional` is treated like `higher` for share CGT (product decision).
 */
export function getShareCgtRatePercent(params: {
  readonly tier: RateTier;
  readonly disposalDateIso: string;
}): number {
  const { tier, disposalDateIso } = params;
  if (disposalDateIso < CGT_MAIN_RATE_CHANGE_DATE) {
    if (tier === 'basic') {
      return 10;
    }

    return 20;
  }

  if (tier === 'basic') {
    return 18;
  }

  return 24;
}

/**
 * Whether a disposal falls in the post–30 Oct 2024 rate window (ISO date-only).
 */
export function isDisposalInPostOctober2024RateWindow(disposalDateIso: string): boolean {
  return disposalDateIso >= CGT_MAIN_RATE_CHANGE_DATE;
}
