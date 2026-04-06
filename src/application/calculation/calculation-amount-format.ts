const gbpFormatter = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Numeric GBP amount only (prefix £ in callers when needed). */
export function formatGbpAmount(value: number): string {
  return gbpFormatter.format(value);
}

export function formatUsdCurrency(value: number): string {
  return usdFormatter.format(value);
}
