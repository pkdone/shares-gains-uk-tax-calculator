/**
 * Total acquisition cost for display (GBP): consideration plus allowable fees.
 */
export function totalAcquisitionCostGbp(considerationGbp: number, feesGbp: number): number {
  return considerationGbp + feesGbp;
}

/**
 * Total acquisition cost for display (USD): consideration plus allowable fees.
 */
export function totalAcquisitionCostUsd(considerationUsd: number, feesUsd: number): number {
  return considerationUsd + feesUsd;
}

/**
 * Price per share: total amount ÷ quantity (acquisition consideration, disposal proceeds, etc.).
 */
export function pricePerShare(totalAmount: number, quantity: number): number {
  return totalAmount / quantity;
}

/**
 * Net disposal proceeds after fees (GBP).
 */
export function netDisposalProceedsGbp(grossProceedsGbp: number, feesGbp: number): number {
  return grossProceedsGbp - feesGbp;
}

/**
 * Net disposal proceeds after fees (USD).
 */
export function netDisposalProceedsUsd(grossProceedsUsd: number, feesUsd: number): number {
  return grossProceedsUsd - feesUsd;
}
