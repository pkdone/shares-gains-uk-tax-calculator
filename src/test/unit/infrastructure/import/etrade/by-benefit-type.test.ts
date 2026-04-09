import {
  findEtradeByBenefitTypeHeaderRow,
  findVestScheduleEntryFuzzy,
  isVestDataRowForIndexing,
  normaliseTickerForLookup,
  parseEtradeByBenefitTypeGrid,
  parseNumberCell,
} from '@/infrastructure/import/etrade/by-benefit-type';

describe('isVestDataRowForIndexing', () => {
  const col = {
    rowKind: 0,
    symbol: 1,
    vestDate: 2,
    vestedQty: 3,
    sharesTradedForTaxes: 4,
    taxableGain: 5,
    benefitType: 6,
    grantDateCol: -1,
    sellableQty: -1,
    grantedQty: -1,
    grantNumberCol: -1,
    vestPeriodCol: -1,
  };

  it('treats alternate Record Type labels as vest data when gross shares are present', () => {
    const row = ['Equity Award Activity', 'MDB', '2018-10-01', '100', '', '5000', 'stock'];
    const g = (i: number): string => (row[i] === undefined ? '' : String(row[i]));
    expect(isVestDataRowForIndexing('equity award activity', col, g)).toBe(true);
  });

  it('does not treat Grant or Tax rows as implicit vest', () => {
    const tax = ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'stock'];
    const gt = (i: number): string => (tax[i] === undefined ? '' : String(tax[i]));
    expect(isVestDataRowForIndexing('tax withholding', col, gt)).toBe(false);

    const grant = ['Grant', 'MDB', '', '', '', '', 'RSU'];
    const gg = (i: number): string => (grant[i] === undefined ? '' : String(grant[i]));
    expect(isVestDataRowForIndexing('grant', col, gg)).toBe(false);
  });
});

describe('parseEtradeByBenefitTypeGrid', () => {
  it('extracts one USD acquisition from Tax Withholding row', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', '01/15/2024', '100', '', '', 'RSU'],
      ['Tax Withholding', 'MDB', '01/15/2024', '100', '30', '5000', 'RSU'],
    ];

    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    const errors = issues.filter((i) => i.kind === 'error');
    expect(errors.length).toBe(0);
    expect(drafts).toHaveLength(1);
    const row = drafts[0];
    expect(row).toBeDefined();
    if (row === undefined) {
      return;
    }
    expect(row.economicsKind).toBe('import_usd');
    expect(row.symbol).toBe('MDB');
    expect(row.eventDate).toBe('2024-01-15');
    expect(row.quantity).toBe(70);
    expect(row.grossVestedQuantity).toBe(100);
    expect(row.sharesTradedForTaxes).toBe(30);
    expect(row.considerationUsd).toBeCloseTo(3500, 5);
    expect(row.feesUsd).toBe(0);
  });

  it('finds header row when preceded by title rows', () => {
    const h = [
      'Record Type',
      'Symbol',
      'Vest Date',
      'Vested Qty',
      'Shares Traded for Taxes',
      'Taxable Gain',
      'Benefit Type',
    ];
    const grid = [
      ['By Benefit Type', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      h,
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', '01/15/2024', '100', '', '', 'RSU'],
      ['Tax Withholding', 'MDB', '01/15/2024', '100', '30', '5000', 'RSU'],
    ];
    const located = findEtradeByBenefitTypeHeaderRow(grid);
    expect(located?.headerRowIndex).toBe(2);
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
  });

  it('matches Tax rows when Record Type is not Vest Schedule but row has vested qty (implicit vest)', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Equity Award Activity', 'MDB', '2018-10-01', '100', '', '5000', 'stock'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'stock'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('includes Vest Schedule rows when Settlement Type is Cash (expanded exports differ from Tax rows)', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', '2018-10-01', '100', '', '5000', 'Cash'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'stock'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('matches Tax rows by vest queue order when Vest Schedule has qty but no parseable dates', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', '', '100', '', '5000', 'RSU'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'RSU'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('indexes Vest Schedule when dates use two-digit US years (common Excel format)', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', '10/1/18', '100', '', '5000', 'RSU'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'RSU'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('matches Vest Schedule to Tax rows within a fuzzy date window', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '2018-05-31', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', '2018-09-28', '100', '', '5000', 'RSU'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'RSU'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.eventDate).toBe('2018-10-01');
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('indexes Vest Schedule under every parseable date in the row (grant date vs vest date columns)', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type', 'Note'],
      ['Grant', 'MDB', '2018-05-31', '', '', '', 'RSU', ''],
      ['Vest Schedule', 'MDB', '2018-05-31', '100', '', '5000', 'RSU', '2018-10-01'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'RSU', ''],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.eventDate).toBe('2018-10-01');
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('resolves Vested Qty when Tax Withholding appears before Vest Schedule (lookup by symbol+date)', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Tax Withholding', 'MDB', '01/15/2024', '', '30', '5000', 'RSU'],
      ['Vest Schedule', 'MDB', '01/15/2024', '100', '', '', 'RSU'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
    expect(drafts[0]?.considerationUsd).toBeCloseTo(3500, 5);
  });

  it('infers gross vested from Sellable Qty + Withheld Qty when Tax Vested Qty is blank', () => {
    const expandedHeaders = [
      'Record Type',
      'Symbol',
      'Grant Date',
      'Settlement Type',
      'Granted Qty',
      'Withheld Qty',
      'Vested Qty',
      'Unvested Qty',
      'Deferred / Pending Release Qty',
      'Sellable Qty',
      'Est. Market Value',
      'Grant Number',
    ];
    const grid = [
      expandedHeaders,
      ['Grant', 'MDB', '31-may-2018', 'stock', '1875', '0', '0', '124', '', '', '$29,203.24', 'ru-0710'],
      ['Tax Withholding', 'MDB', '15-Jan-2024', 'stock', '', '30', '', '', '', '70', '$5000', ''],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.symbol).toBe('MDB');
    expect(drafts[0]?.quantity).toBe(70);
    expect(drafts[0]?.considerationUsd).toBeCloseTo(3500, 5);
  });

  it('forward-fills Grant Number and Vest Period on Tax rows when Excel merged cells leave L/S blank', () => {
    const grid = [
      [
        'Record Type',
        'Symbol',
        'Grant Date',
        'Vested Qty',
        'Withheld Qty',
        'Est. Market Value',
        'Settlement Type',
        'Grant Number',
        'Vest Period',
        'Vest Date',
      ],
      ['Grant', 'MDB', '2018-05-31', '0', '0', '1000', 'stock', 'RU-0710', '', ''],
      ['Vest Schedule', '', '', '100', '0', '5000', 'stock', '', '1', '2018-10-01'],
      ['Tax Withholding', '', '', '', '30', '5000', 'stock', '', '', ''],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('resolves Tax Withholding via Grant Number and Vest Period when Symbol and date cells are blank', () => {
    const grid = [
      [
        'Record Type',
        'Symbol',
        'Grant Date',
        'Vested Qty',
        'Withheld Qty',
        'Est. Market Value',
        'Settlement Type',
        'Grant Number',
        'Vest Period',
        'Vest Date',
      ],
      ['Grant', 'MDB', '2018-05-31', '0', '0', '1000', 'stock', 'RU-0710', '', ''],
      ['Vest Schedule', '', '', '100', '0', '5000', 'stock', 'RU-0710', '1', '2018-10-01'],
      ['Tax Withholding', '', '', '', '30', '5000', 'stock', 'RU-0710', '1', ''],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.symbol).toBe('MDB');
    expect(drafts[0]?.eventDate).toBe('2018-10-01');
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('matches expanded exports with separate Grant Date and Vest Date columns (sparse Tax rows)', () => {
    const grid = [
      [
        'Record Type',
        'Symbol',
        'Grant Date',
        'Vested Qty',
        'Withheld Qty',
        'Est. Market Value',
        'Settlement Type',
        'Vest Date',
      ],
      ['Grant', 'MDB', '2018-05-31', '0', '0', '1000', 'stock', ''],
      ['Vest Schedule', '', '', '100', '0', '5000', 'stock', '2018-10-01'],
      ['Tax Withholding', '', '', '', '30', '5000', 'stock', ''],
      ['Tax Withholding', '', '', '', '5', '500', 'stock', ''],
      ['Totals', '', '', '', '', '', '', ''],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.eventDate).toBe('2018-10-01');
    expect(drafts[0]?.quantity).toBe(70);
    expect(drafts[1]?.quantity).toBe(95);
  });

  it('matches ByBenefitType_expanded-style headers and inherits sparse Tax Withholding rows', () => {
    const expandedHeaders = [
      'Record Type',
      'Symbol',
      'Grant Date',
      'Settlement Type',
      'Granted Qty',
      'Withheld Qty',
      'Vested Qty',
      'Unvested Qty',
      'Deferred / Pending Release Qty',
      'Sellable Qty',
      'Est. Market Value',
      'Grant Number',
    ];
    const grid = [
      expandedHeaders,
      ['Grant', 'MDB', '31-may-2018', 'stock', '1875', '0', '0', '124', '', '', '$29,203.24', 'ru-0710'],
      ['Vest Schedule', 'MDB', '15-Jan-2024', 'stock', '', '', '100', '', '', '', '$5000', ''],
      ['Tax Withholding', '', '', 'stock', '', '30', '', '', '', '', '', ''],
    ];
    expect(findEtradeByBenefitTypeHeaderRow(grid)).not.toBeNull();
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.symbol).toBe('MDB');
    expect(drafts[0]?.eventDate).toBe('2024-01-15');
    expect(drafts[0]?.quantity).toBe(70);
    expect(drafts[0]?.considerationUsd).toBeCloseTo(3500, 5);
  });

  it('indexes Vest Schedule when Grant Date uses long month text (vest lookup for Tax rows)', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB', 'October 1, 2018', '100', '', '5000', 'RSU'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'RSU'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.quantity).toBe(70);
  });

  it('matches Tax rows when vest Symbol is qualified and Tax row uses plain ticker', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Grant', 'MDB.US', '', '', '', '', 'RSU'],
      ['Vest Schedule', 'MDB.US', '2018-10-01', '100', '', '5000', 'RSU'],
      ['Tax Withholding', 'MDB', '2018-10-01', '', '30', '5000', 'RSU'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(issues.filter((i) => i.kind === 'error').length).toBe(0);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.symbol).toBe('MDB');
  });

  it('parses currency cells', () => {
    expect(parseNumberCell('$29,203.24')).toBeCloseTo(29203.24, 2);
    expect(parseNumberCell('100')).toBe(100);
  });

  it('normaliseTickerForLookup strips common exchange suffixes', () => {
    expect(normaliseTickerForLookup('MDB.US')).toBe('MDB');
    expect(normaliseTickerForLookup('NASDAQ:MDB')).toBe('MDB');
  });

  it('findVestScheduleEntryFuzzy picks closest date within max days', () => {
    const map = new Map([
      ['MDB|2018-09-28', { vestedQty: 100, marketOrGain: 5000, sharesTradedForTaxes: null }],
      ['MDB|2019-06-01', { vestedQty: 50, marketOrGain: 1000, sharesTradedForTaxes: null }],
    ]);
    expect(findVestScheduleEntryFuzzy(map, 'MDB', '2018-10-01', 14)?.vestedQty).toBe(100);
    expect(findVestScheduleEntryFuzzy(map, 'MDB', '2018-10-01', 2)).toBeNull();
  });

  it('resolves correct columns in expanded 63-col layout with duplicate header names', () => {
    const makeRow = (len: number): string[] => Array.from({ length: len }, () => '');

    const hdr = makeRow(42);
    hdr[0] = 'Record Type';
    hdr[1] = 'Symbol';
    hdr[2] = 'Grant Date';
    hdr[3] = 'Settlement Type';
    hdr[4] = 'Granted Qty.';
    hdr[5] = 'Withheld Qty.';
    hdr[6] = 'Vested Qty.';
    hdr[9] = 'Sellable Qty.';
    hdr[10] = 'Est. Market Value';
    hdr[11] = 'Grant Number';
    hdr[18] = 'Vest Period';
    hdr[19] = 'Vest Date';
    hdr[25] = 'Vested Qty.';
    hdr[38] = 'Shares Traded for taxes';
    hdr[41] = 'Taxable Gain';

    const grant = makeRow(42);
    grant[0] = 'Grant';
    grant[1] = 'MDB';
    grant[2] = '31-MAY-2018';
    grant[3] = 'Stock';
    grant[4] = '1875';
    grant[6] = '1875';
    grant[9] = '124';
    grant[10] = '$29,203.24';
    grant[11] = 'RU-0710';

    const vest = makeRow(42);
    vest[0] = 'Vest Schedule';
    vest[5] = '0';
    vest[11] = 'RU-0710';
    vest[18] = '1';
    vest[19] = '10/01/2018';
    vest[25] = '117';
    vest[38] = '58';

    const tax1 = makeRow(42);
    tax1[0] = 'Tax Withholding';
    tax1[11] = 'RU-0710';
    tax1[18] = '1';
    tax1[41] = '$9,226.62';

    const tax2 = makeRow(42);
    tax2[0] = 'Tax Withholding';
    tax2[11] = 'RU-0710';
    tax2[18] = '1';
    tax2[41] = '$9,226.62';

    const grid = [hdr, grant, vest, tax1, tax2];

    const located = findEtradeByBenefitTypeHeaderRow(grid);
    expect(located).not.toBeNull();
    expect(located?.col.vestedQty).toBe(25);
    expect(located?.col.sharesTradedForTaxes).toBe(38);
    expect(located?.col.taxableGain).toBe(41);
    expect(located?.col.vestDate).toBe(19);
    expect(located?.col.grantDateCol).toBe(2);

    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    const errors = issues.filter((i) => i.kind === 'error');
    expect(errors).toHaveLength(0);
    expect(drafts).toHaveLength(1);

    const d = drafts[0];
    expect(d).toBeDefined();
    if (d === undefined) {
      return;
    }
    expect(d.symbol).toBe('MDB');
    expect(d.eventDate).toBe('2018-10-01');
    expect(d.quantity).toBe(59);
    expect(d.grossVestedQuantity).toBe(117);
    expect(d.sharesTradedForTaxes).toBe(58);
    expect(d.grantNumber).toBe('RU-0710');
    expect(d.vestPeriod).toBe('1');
    const perShare = 9226.62 / 117;
    expect(d.considerationUsd).toBeCloseTo(perShare * 59, 2);
  });

  it('filters non-RSU benefit types', () => {
    const grid = [
      ['Row Kind', 'Symbol', 'Vest Date', 'Vested Qty', 'Shares Traded for Taxes', 'Taxable Gain', 'Benefit Type'],
      ['Tax Withholding', 'X', '2024-06-01', '10', '0', '100', 'ESPP'],
    ];
    const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
    expect(drafts.length).toBe(0);
    const errs = issues.filter((i) => i.kind === 'error');
    expect(errs.length).toBeGreaterThan(0);
  });
});
