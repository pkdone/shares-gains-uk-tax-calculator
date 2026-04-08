import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';

import type { EtradeColumnKey } from './column-aliases';

export type EtradeParseIssue = {
  readonly kind: 'error' | 'notice';
  readonly message: string;
  readonly rowIndex?: number;
};

export type EtradeParseResult = {
  readonly drafts: readonly ShareAcquisitionImportUsd[];
  readonly issues: readonly EtradeParseIssue[];
};

export type EtradeColumnIndices = Record<EtradeColumnKey, number> & {
  /**
   * Parent **Grant Date** (expanded layouts, column C). Sub-rows leave this blank; use with Grant
   * rows only. -1 when the sheet has no separate Grant Date column.
   */
  readonly grantDateCol: number;
  /**
   * Column index for optional "Sellable" / net-shares cells, or -1 when the sheet has no such column.
   * Used to infer gross vested qty as sellable + withheld when Vested Qty is blank on Tax rows.
   */
  readonly sellableQty: number;
  /**
   * Optional "Granted Qty" / award quantity (expanded exports); used when Vested Qty is blank but
   * this column holds gross shares for the vest/tax line.
   */
  readonly grantedQty: number;
  /** Grant Number / award id (column L in expanded exports); links Tax rows to Vest Schedule. */
  readonly grantNumberCol: number;
  /** Vest Period / sequence (column S); pairs with Grant Number. */
  readonly vestPeriodCol: number;
};
