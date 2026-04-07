import type { CalcEvent } from '@/domain/schemas/calculation';

import type { LedgerLine } from './ledger-types';

/**
 * Sort key shared by ledger UI and calculation: date ascending, acquisitions before disposals, then id.
 */
export function compareLedgerLines(a: LedgerLine, b: LedgerLine): number {
  return compareAcquisitionDisposalLedgerUnion(a, b);
}

function compareAcquisitionDisposalLedgerUnion<
  T extends {
    readonly kind: 'ACQUISITION' | 'DISPOSAL';
    readonly data: { readonly eventDate: string; readonly id: string };
  },
>(a: T, b: T): number {
  const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  const kindRank = (k: T['kind']): number => (k === 'ACQUISITION' ? 0 : 1);
  const kindDiff = kindRank(a.kind) - kindRank(b.kind);
  if (kindDiff !== 0) {
    return kindDiff;
  }

  return a.data.id.localeCompare(b.data.id);
}

export function compareCalcEvents(a: CalcEvent, b: CalcEvent): number {
  const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  if (a.kind === b.kind) {
    return 0;
  }

  return a.kind === 'acquisition' ? -1 : 1;
}
