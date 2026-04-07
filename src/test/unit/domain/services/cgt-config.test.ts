import {
  CGT_MAIN_RATE_CHANGE_DATE,
  getAeaGbpForTaxYearLabel,
  getShareCgtRatePercent,
} from '@/domain/services/cgt-config';
import { DomainError } from '@/domain/errors/domain-error';

describe('getAeaGbpForTaxYearLabel', () => {
  it('returns PRD values for key years', () => {
    expect(getAeaGbpForTaxYearLabel('2016-17')).toBe(11_100);
    expect(getAeaGbpForTaxYearLabel('2022-23')).toBe(12_300);
    expect(getAeaGbpForTaxYearLabel('2023-24')).toBe(6000);
    expect(getAeaGbpForTaxYearLabel('2024-25')).toBe(3000);
    expect(getAeaGbpForTaxYearLabel('2025-26')).toBe(3000);
  });

  it('throws on invalid label', () => {
    expect(() => getAeaGbpForTaxYearLabel('nope')).toThrow(DomainError);
  });

  it('throws before 2016-17', () => {
    expect(() => getAeaGbpForTaxYearLabel('2015-16')).toThrow(DomainError);
  });
});

describe('getShareCgtRatePercent', () => {
  it('uses pre Oct 2024 main rates for disposals before change date', () => {
    expect(
      getShareCgtRatePercent({ tier: 'basic', disposalDateIso: '2024-10-29' }),
    ).toBe(10);
    expect(
      getShareCgtRatePercent({ tier: 'higher', disposalDateIso: '2024-10-29' }),
    ).toBe(20);
    expect(
      getShareCgtRatePercent({ tier: 'additional', disposalDateIso: '2024-10-29' }),
    ).toBe(20);
  });

  it('uses post Oct 2024 main rates on and after change date', () => {
    expect(
      getShareCgtRatePercent({ tier: 'basic', disposalDateIso: CGT_MAIN_RATE_CHANGE_DATE }),
    ).toBe(18);
    expect(
      getShareCgtRatePercent({ tier: 'higher', disposalDateIso: '2024-10-30' }),
    ).toBe(24);
    expect(
      getShareCgtRatePercent({ tier: 'additional', disposalDateIso: '2025-01-01' }),
    ).toBe(24);
  });
});
