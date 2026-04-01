import type { CalcEvent, CalcInput, CalcOutput } from '@/domain/schemas/calculation';
import { calcInputSchema } from '@/domain/schemas/calculation';
import { computeAnnualSummaries } from '@/domain/services/cgt-annual-summary';
import { computeMatchingOutput } from '@/domain/services/share-matching';
import { DomainError } from '@/shared/errors/app-error';

function compareEvents(a: CalcEvent, b: CalcEvent): number {
  const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  if (a.kind === b.kind) {
    return 0;
  }

  return a.kind === 'acquisition' ? -1 : 1;
}

function assertSortedEvents(events: readonly CalcEvent[]): CalcEvent[] {
  const sorted = [...events].sort(compareEvents);
  for (let i = 0; i < events.length; i += 1) {
    const orig = events[i];
    const exp = sorted[i];
    if (orig === undefined || exp === undefined) {
      throw new DomainError('Internal: event index out of range');
    }

    if (orig.kind !== exp.kind || orig.data.eventDate !== exp.data.eventDate) {
      throw new DomainError(
        'Calculation events must be sorted by event date (YYYY-MM-DD); acquisitions before disposals on the same day',
      );
    }
  }

  return sorted;
}

/**
 * Same-day, 30-day, and Section 104 pool matching + annual CGT summaries for one symbol (GBP-only).
 */
export function calculateGainsForSymbol(input: CalcInput): CalcOutput {
  const parsed = calcInputSchema.parse(input);
  const events = assertSortedEvents(parsed.events);

  if (events.length === 0) {
    return {
      symbol: parsed.symbol,
      poolSnapshots: [],
      disposalResults: [],
      taxYearSummaries: [],
    };
  }

  const { poolSnapshots, disposalResults } = computeMatchingOutput(events);

  const taxYearSummaries = computeAnnualSummaries({ disposalResults });

  return {
    symbol: parsed.symbol,
    poolSnapshots,
    disposalResults,
    taxYearSummaries: [...taxYearSummaries],
  };
}
