/**
 * Total acquisition cost for display (GBP): consideration plus allowable fees.
 */
export function totalAcquisitionCostGbp(
  grossConsiderationGbp: number,
  feesGbp: number,
): number {
  return grossConsiderationGbp + feesGbp;
}

/**
 * Total acquisition cost for display (USD): consideration plus allowable fees.
 */
export function totalAcquisitionCostUsd(
  grossConsiderationUsd: number,
  feesUsd: number,
): number {
  return grossConsiderationUsd + feesUsd;
}

/**
 * Net disposal proceeds after fees (GBP).
 */
export function netDisposalProceedsGbp(grossProceedsGbp: number, feesGbp: number): number {
  return grossProceedsGbp - feesGbp;
}
