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
 * Net disposal proceeds after fees (GBP).
 */
export function netDisposalProceedsGbp(grossProceedsGbp: number, feesGbp: number): number {
  return grossProceedsGbp - feesGbp;
}
