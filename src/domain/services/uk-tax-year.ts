import { DomainError } from '@/domain/errors/domain-error';

/**
 * UK tax year label (e.g. `2024-25`) for the period 6 April–5 April inclusive,
 * using UTC date-only calendar components of `isoDate` (YYYY-MM-DD).
 */
export function ukTaxYearLabelFromDateOnly(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new DomainError('Expected date-only string YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new DomainError('Invalid date components');
  }

  const t = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(t.getTime())) {
    throw new DomainError('Invalid calendar date');
  }

  let startYear: number;
  if (month > 4 || (month === 4 && day >= 6)) {
    startYear = year;
  } else {
    startYear = year - 1;
  }

  const endYear = startYear + 1;
  const endTwoDigits = String(endYear).slice(-2).padStart(2, '0');
  return `${startYear}-${endTwoDigits}`;
}

/**
 * First calendar day of the UK tax year for a label (e.g. `2024-25` → `2024-04-06`), UTC date-only.
 */
export function ukTaxYearStartDateFromLabel(taxYearLabel: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(taxYearLabel);
  if (!match) {
    throw new DomainError('Expected tax year label YYYY-YY');
  }

  const startYear = Number(match[1]);
  const endTwoDigits = Number(match[2]);
  if (!Number.isFinite(startYear) || !Number.isFinite(endTwoDigits)) {
    throw new DomainError('Invalid tax year label');
  }

  const expectedEnd = (startYear + 1) % 100;
  if (endTwoDigits !== expectedEnd) {
    throw new DomainError('Tax year label end year does not match start year');
  }

  return `${String(startYear)}-04-06`;
}

/**
 * Display form of a UK tax year label (e.g. `2024-25` → `2024/25`) for UI copy.
 * Validates the same canonical `YYYY-YY` shape as {@link ukTaxYearStartDateFromLabel}.
 */
export function formatUkTaxYearLabelForDisplay(taxYearLabel: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(taxYearLabel);
  if (!match) {
    throw new DomainError('Expected tax year label YYYY-YY');
  }

  const startYear = Number(match[1]);
  const endTwoDigits = Number(match[2]);
  if (!Number.isFinite(startYear) || !Number.isFinite(endTwoDigits)) {
    throw new DomainError('Invalid tax year label');
  }

  const expectedEnd = (startYear + 1) % 100;
  if (endTwoDigits !== expectedEnd) {
    throw new DomainError('Tax year label end year does not match start year');
  }

  return `${String(startYear)}/${match[2]}`;
}
