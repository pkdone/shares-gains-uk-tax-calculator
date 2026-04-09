const gbpFormatter = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Plain USD numeric (no symbol); use a `$` prefix in UI when needed. */
const usdPlainFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** USD per-share style (e.g. ledger price columns): 2–4 fraction digits. */
const usdPricePerShareFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Numeric GBP amount only (prefix `£` in callers when needed). */
export function formatGbpAmount(value: number): string {
  return gbpFormatter.format(value);
}

/** USD with `$` and grouping (e.g. calculation detail tables). */
export function formatUsdCurrency(value: number): string {
  return usdCurrencyFormatter.format(value);
}

/** Plain USD amount, `en-US` grouping; no currency symbol. */
export function formatUsdPlainAmount(value: number): string {
  return usdPlainFormatter.format(value);
}

/** USD price per share where brokers may use up to four decimal places. */
export function formatUsdPricePerShare(value: number): string {
  return usdPricePerShareFormatter.format(value);
}
