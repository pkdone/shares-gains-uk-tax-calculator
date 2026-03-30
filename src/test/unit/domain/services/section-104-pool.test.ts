import {
  addAcquisition,
  createEmptyPool,
  disposeFromPool,
  roundMoney2dp,
} from '@/domain/services/section-104-pool';
import { DomainError } from '@/shared/errors/app-error';

describe('section-104-pool', () => {
  it('starts empty', () => {
    const pool = createEmptyPool();
    expect(pool.shares).toBe(0);
    expect(pool.costGbp).toBe(0);
  });

  it('adds acquisitions', () => {
    let pool = createEmptyPool();
    pool = addAcquisition(pool, 1000, 4150);
    expect(pool.shares).toBe(1000);
    expect(pool.costGbp).toBe(4150);
    pool = addAcquisition(pool, 500, 2130);
    expect(pool.shares).toBe(1500);
    expect(pool.costGbp).toBe(6280);
  });

  it('applies partial disposal with 2dp allowable cost', () => {
    let pool = createEmptyPool();
    pool = addAcquisition(pool, 1500, 6280);
    const { allowableCostGbp, poolAfter } = disposeFromPool(pool, 700);
    expect(allowableCostGbp).toBe(2930.67);
    expect(poolAfter.shares).toBe(800);
    expect(poolAfter.costGbp).toBe(3349.33);
  });

  it('empties pool on full disposal', () => {
    let pool = createEmptyPool();
    pool = addAcquisition(pool, 10, 100.25);
    const { allowableCostGbp, poolAfter } = disposeFromPool(pool, 10);
    expect(allowableCostGbp).toBe(100.25);
    expect(poolAfter.shares).toBe(0);
    expect(poolAfter.costGbp).toBe(0);
  });

  it('throws when disposal exceeds pool', () => {
    let pool = createEmptyPool();
    pool = addAcquisition(pool, 100, 1000);
    expect(() => disposeFromPool(pool, 101)).toThrow(DomainError);
  });

  it('roundMoney2dp matches engine rounding', () => {
    expect(roundMoney2dp(2930.666_666_666_666_5)).toBe(2930.67);
  });
});
