import {
  formatUkTaxYearLabelForDisplay,
  ukTaxYearLabelFromDateOnly,
  ukTaxYearStartDateFromLabel,
} from '@/domain/services/uk-tax-year';
import { DomainError } from '@/shared/errors/app-error';

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

describe('ukTaxYearStartDateFromLabel', () => {
  it('maps a label to 6 April of the start year', () => {
    expect(ukTaxYearStartDateFromLabel('2024-25')).toBe('2024-04-06');
    expect(ukTaxYearStartDateFromLabel('1999-00')).toBe('1999-04-06');
  });

  it('rejects labels whose end year does not match the start year', () => {
    expect(() => ukTaxYearStartDateFromLabel('2024-24')).toThrow(DomainError);
  });
});

describe('formatUkTaxYearLabelForDisplay', () => {
  it('formats canonical labels with a slash', () => {
    expect(formatUkTaxYearLabelForDisplay('2018-19')).toBe('2018/19');
    expect(formatUkTaxYearLabelForDisplay('2024-25')).toBe('2024/25');
    expect(formatUkTaxYearLabelForDisplay('1999-00')).toBe('1999/00');
  });

  it('rejects invalid labels like ukTaxYearStartDateFromLabel', () => {
    expect(() => formatUkTaxYearLabelForDisplay('2024-24')).toThrow(DomainError);
  });
});
