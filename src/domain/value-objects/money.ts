/**
 * Round to two decimal places (pence).
 */
export function roundMoney2dp(value: number): number {
  return Math.round(value * 100) / 100;
}
