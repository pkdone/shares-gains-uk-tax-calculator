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

/** Optional columns matched in the By Benefit Type parser (not part of {@link COLUMN_ALIASES}). */
export const SELLABLE_QTY_ALIASES: readonly string[] = [
  'sellable qty',
  'sellable shares',
  'sellable quantity',
  'net shares',
  'shares deposited',
  'net qty',
  'qty sellable',
];

export const GRANTED_QTY_ALIASES: readonly string[] = [
  'granted qty',
  'grant quantity',
  'shares granted',
  'total granted',
  'award qty',
  'award quantity',
];

export const GRANT_NUMBER_ALIASES: readonly string[] = [
  'grant number',
  'grant no',
  'grant nr',
  'grant id',
  'grant #',
  'award id',
  'award number',
  'reference',
];

export const VEST_PERIOD_ALIASES: readonly string[] = [
  'vest period',
  'vesting period',
  'vest #',
  'tranche',
  'installment',
];

/** Parent grant date only (column C in expanded "By Benefit Type" exports). */
export const GRANT_DATE_ALIASES: readonly string[] = [
  'grant date',
  'grant dt',
  'date of grant',
  'award date',
];

/**
 * First tranche / vest event date column — **not** Grant Date. When both Grant Date and Vest Date
 * exist, vest date resolution must use Vest Date so sub-rows read the event from column T, not
 * empty Grant Date cells in column C.
 */
export const VESTING_EVENT_DATE_ALIASES: readonly string[] = [
  'vest date',
  'vesting date',
  'release date',
  'grant release date',
  'release dt',
  'vest dt',
  'vest period end',
  'event date',
];
