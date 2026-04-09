import type { CalcEvent } from '@/domain/schemas/calculation';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';

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

/**
 * Merges acquisition and disposal {@link CalcEvent} streams that are each sorted by
 * {@link compareCalcEvents}.
 */
export function mergeCalcEventsSorted(
  acquisitions: readonly Extract<CalcEvent, { kind: 'acquisition' }>[],
  disposals: readonly Extract<CalcEvent, { kind: 'disposal' }>[],
): CalcEvent[] {
  let i = 0;
  let j = 0;
  const out: CalcEvent[] = [];

  while (i < acquisitions.length && j < disposals.length) {
    const a = acquisitions[i];
    const b = disposals[j];
    if (a === undefined || b === undefined) {
      break;
    }
    if (compareCalcEvents(a, b) <= 0) {
      out.push(a);
      i += 1;
    } else {
      out.push(b);
      j += 1;
    }
  }

  while (i < acquisitions.length) {
    const row = acquisitions[i];
    if (row === undefined) {
      break;
    }
    out.push(row);
    i += 1;
  }

  while (j < disposals.length) {
    const row = disposals[j];
    if (row === undefined) {
      break;
    }
    out.push(row);
    j += 1;
  }

  return out;
}

/**
 * Merges two lists that are each sorted by {@link compareLedgerLines} into one sorted list in O(n+m).
 */
export function mergeLedgerLinesSorted(
  acquisitions: readonly ShareAcquisition[],
  disposals: readonly ShareDisposal[],
): LedgerLine[] {
  const left = acquisitions.map((data) => ({ kind: 'ACQUISITION' as const, data }));
  const right = disposals.map((data) => ({ kind: 'DISPOSAL' as const, data }));
  let i = 0;
  let j = 0;
  const out: LedgerLine[] = [];

  while (i < left.length && j < right.length) {
    const a = left[i];
    const b = right[j];
    if (a === undefined || b === undefined) {
      break;
    }
    if (compareLedgerLines(a, b) <= 0) {
      out.push(a);
      i += 1;
    } else {
      out.push(b);
      j += 1;
    }
  }

  while (i < left.length) {
    const row = left[i];
    if (row === undefined) {
      break;
    }
    out.push(row);
    i += 1;
  }

  while (j < right.length) {
    const row = right[j];
    if (row === undefined) {
      break;
    }
    out.push(row);
    j += 1;
  }

  return out;
}
