import { parseFlexibleDateOnly, tryParseSpreadsheetDateCell } from '@/domain/services/date-only-parse';

describe('parseFlexibleDateOnly', () => {
  it('accepts ISO date-only strings', () => {
    expect(parseFlexibleDateOnly('2024-06-01')).toBe('2024-06-01');
  });

  it('parses US slash dates', () => {
    expect(parseFlexibleDateOnly('01/15/2024')).toBe('2024-01-15');
  });

  it('parses US slash dates with two-digit years (Excel exports)', () => {
    expect(parseFlexibleDateOnly('10/1/18')).toBe('2018-10-01');
    expect(parseFlexibleDateOnly('1/15/24')).toBe('2024-01-15');
  });

  it('parses ISO date with time portion', () => {
    expect(parseFlexibleDateOnly('2018-10-01 00:00:00')).toBe('2018-10-01');
    expect(parseFlexibleDateOnly('2018-10-01T12:00:00.000Z')).toBe('2018-10-01');
  });

  it('parses DD-MMM-YYYY', () => {
    expect(parseFlexibleDateOnly('15-Jan-2024')).toBe('2024-01-15');
  });

  it('parses DD-MMM-YY', () => {
    expect(parseFlexibleDateOnly('1-Oct-18')).toBe('2018-10-01');
  });

  it('parses long English month names (common Excel display formats)', () => {
    expect(parseFlexibleDateOnly('October 1, 2018')).toBe('2018-10-01');
    expect(parseFlexibleDateOnly('Oct 1, 2018')).toBe('2018-10-01');
    expect(parseFlexibleDateOnly('1 October 2018')).toBe('2018-10-01');
  });

  it('returns null for empty input', () => {
    expect(parseFlexibleDateOnly('')).toBeNull();
    expect(parseFlexibleDateOnly('   ')).toBeNull();
  });
});

describe('tryParseSpreadsheetDateCell', () => {
  it('parses Excel serial days in a typical range', () => {
    const iso = tryParseSpreadsheetDateCell('44927');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it('does not treat share quantities as Excel dates', () => {
    expect(tryParseSpreadsheetDateCell('1875')).toBeNull();
  });

  it('delegates to text formats', () => {
    expect(tryParseSpreadsheetDateCell('31-may-2018')).toBe('2018-05-31');
  });
});
