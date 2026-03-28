import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';

describe('ukTaxYearLabelFromDateOnly', () => {
  it('labels 5 April as end of prior tax year', () => {
    expect(ukTaxYearLabelFromDateOnly('2024-04-05')).toBe('2023-24');
  });

  it('labels 6 April as start of new tax year', () => {
    expect(ukTaxYearLabelFromDateOnly('2024-04-06')).toBe('2024-25');
  });

  it('labels March dates in the following calendar year as previous tax year start', () => {
    expect(ukTaxYearLabelFromDateOnly('2025-03-31')).toBe('2024-25');
  });

  it('labels January in new calendar year', () => {
    expect(ukTaxYearLabelFromDateOnly('2026-01-15')).toBe('2025-26');
  });
});
