/** Canonical normalised names (for docs/tests); matching uses {@link COLUMN_ALIASES}. */
export const ETRADE_BY_BENEFIT_TYPE_HEADERS = {
  rowKind: 'row kind',
  symbol: 'symbol',
  vestDate: 'vest date',
  vestedQty: 'vested qty',
  sharesTradedForTaxes: 'shares traded for taxes',
  taxableGain: 'taxable gain',
  benefitType: 'benefit type',
} as const;

export type EtradeColumnKey = keyof typeof ETRADE_BY_BENEFIT_TYPE_HEADERS;

/**
 * Aliases for real E*Trade / Morgan Stanley "By Benefit Type" exports (may differ from the
 * minimal test fixture). Matching is exact on {@link normaliseHeaderKey}.
 */
export const COLUMN_ALIASES: Readonly<Record<EtradeColumnKey, readonly string[]>> = {
  rowKind: [
    'row kind',
    'record type',
    'row type',
    'line type',
    'benefit row type',
  ],
  symbol: ['symbol', 'ticker', 'stock symbol', 'ticker symbol', 'issue symbol'],
  /**
   * Tranche / event date column (Vest Date in expanded exports — column T). **Not** parent Grant Date;
   * that is resolved separately into {@link EtradeColumnIndices.grantDateCol}.
   */
  vestDate: [
    'vest date',
    'release date',
    'vesting date',
    'grant release date',
    'release dt',
    'vest dt',
  ],
  vestedQty: [
    'vested qty',
    'vested quantity',
    'shares vested',
    'released shares',
    'shares released',
    'vest shares',
    'shares released/vested',
    'released qty',
    'release qty',
    'qty released',
    'shares released this period',
    'event qty',
    'vest event qty',
  ],
  sharesTradedForTaxes: [
    'shares traded for taxes',
    'shares sold for taxes',
    'shares withheld for taxes',
    'shares sold to cover taxes',
    'traded for taxes',
    'sold for taxes',
    /** Generic — may collide with grant-level `Withheld Qty.`; keep last so specific aliases win. */
    'withheld qty',
    'withheld shares',
    'shares withheld',
  ],
  taxableGain: [
    'taxable gain',
    'taxable income',
    'ordinary income',
    'federal taxable gain',
    'state taxable gain',
    /** Generic — may collide with grant-level `Est. Market Value`; keep last so specific aliases win. */
    'estimated market value',
    'est. market value',
    'market value',
    'fmv',
  ],
  benefitType: [
    'benefit type',
    'award type',
    'plan type',
    'award name',
    'grant type',
    'equity award type',
    /** Expanded export: e.g. `stock` for RSU/settled stock. */
    'settlement type',
  ],
};
