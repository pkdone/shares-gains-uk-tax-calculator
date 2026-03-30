import { DomainError } from '@/shared/errors/app-error';

export type Section104Pool = {
  readonly shares: number;
  /** Pool of allowable cost (GBP), held to 2 decimal places where applicable. */
  readonly costGbp: number;
};

/**
 * Round to two decimal places (pence).
 */
export function roundMoney2dp(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createEmptyPool(): Section104Pool {
  return { shares: 0, costGbp: 0 };
}

export function addAcquisition(
  pool: Section104Pool,
  quantity: number,
  totalCostGbp: number,
): Section104Pool {
  if (quantity <= 0 || !Number.isFinite(quantity)) {
    throw new DomainError('Acquisition quantity must be a positive finite number');
  }

  if (totalCostGbp < 0 || !Number.isFinite(totalCostGbp)) {
    throw new DomainError('Acquisition total cost must be a non-negative finite number');
  }

  return {
    shares: pool.shares + quantity,
    costGbp: roundMoney2dp(pool.costGbp + totalCostGbp),
  };
}

export type DisposalFromPoolResult = {
  readonly allowableCostGbp: number;
  readonly poolAfter: Section104Pool;
};

/**
 * Section 104 partial disposal: allowable cost is a proportion of pool cost.
 * Full disposal assigns the entire remaining pool cost to avoid penny drift.
 */
export function disposeFromPool(pool: Section104Pool, quantity: number): DisposalFromPoolResult {
  if (quantity <= 0 || !Number.isFinite(quantity)) {
    throw new DomainError('Disposal quantity must be a positive finite number');
  }

  if (quantity > pool.shares) {
    throw new DomainError('Disposal quantity cannot exceed shares in the Section 104 pool');
  }

  if (pool.shares <= 0) {
    throw new DomainError('Cannot dispose from an empty Section 104 pool');
  }

  const allowableCostGbp =
    quantity === pool.shares
      ? roundMoney2dp(pool.costGbp)
      : roundMoney2dp((pool.costGbp * quantity) / pool.shares);

  const poolAfter: Section104Pool = {
    shares: pool.shares - quantity,
    costGbp: roundMoney2dp(pool.costGbp - allowableCostGbp),
  };

  return { allowableCostGbp, poolAfter };
}
