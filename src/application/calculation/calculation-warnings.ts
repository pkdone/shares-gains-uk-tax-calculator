import type {
  CalculationLedgerLine,
  FxAppliedToAcquisition,
  FxAppliedToDisposal,
} from '@/application/calculation/calculation-types';
import type { CalcOutput } from '@/domain/schemas/calculation';

const STATIC_TABLE_INTERPRETATION_WARNINGS: readonly string[] = [
  'Rows are in date order for readability. Matching does not follow this visual order: each disposal is matched under HMRC rules (same day, then acquisitions within 30 days after the disposal, then the Section 104 pool).',
  'Amounts in this table are in sterling using this app’s exchange-rate rules (see FX applied). They may not match your broker’s figures or intraday rates.',
  'Blank cells mean the field does not apply to that row (for example, gain on an acquisition line), not zero.',
  'Section 104 pool totals after processing for a date appear on the CGT summary row for each disposal date, and on the acquisition aggregate summary when multiple acquisitions fall on the same date without a disposal on that date.',
];

/**
 * Warnings when the calculation table layout could hide or obscure material facts.
 */
export function buildMaterialCalculationWarnings(params: {
  readonly ledgerLines: readonly CalculationLedgerLine[];
  readonly output: CalcOutput;
  readonly fxByAcquisitionId: Readonly<Record<string, FxAppliedToAcquisition>>;
  readonly fxByDisposalId: Readonly<Record<string, FxAppliedToDisposal>>;
}): readonly string[] {
  const { ledgerLines, output, fxByAcquisitionId, fxByDisposalId } = params;
  const warnings: string[] = [];

  const linesByDate = new Map<string, CalculationLedgerLine[]>();
  for (const line of ledgerLines) {
    const d = line.data.eventDate;
    const existing = linesByDate.get(d);
    if (existing === undefined) {
      linesByDate.set(d, [line]);
    } else {
      existing.push(line);
    }
  }

  const multiLineDates: string[] = [];
  const mixedAcqDispDates: string[] = [];

  for (const [date, lines] of [...linesByDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (lines.length > 1) {
      multiLineDates.push(date);
    }

    const hasAcquisition = lines.some((l) => l.kind === 'ACQUISITION');
    const hasDisposal = lines.some((l) => l.kind === 'DISPOSAL');
    if (hasAcquisition && hasDisposal) {
      mixedAcqDispDates.push(date);
    }
  }

  if (multiLineDates.length > 0) {
    warnings.push(
      `These dates have more than one ledger line: ${multiLineDates.join(', ')}. Same-day identification and any gain or loss are calculated on the combined amounts for each date — not separately for each line.`,
    );
  }

  if (mixedAcqDispDates.length > 0) {
    warnings.push(
      `These dates have both acquisitions and disposals: ${mixedAcqDispDates.join(', ')}. Each acquisition line shows that entry’s cost; only the unmatched amount is added to the Section 104 pool after same-day matching for that date.`,
    );
  }

  let sawThirtyDay = false;
  for (const d of output.disposalResults) {
    if (d.matchingBreakdown.some((t) => t.source === 'thirty-day')) {
      sawThirtyDay = true;
      break;
    }
  }

  if (sawThirtyDay) {
    warnings.push(
      'At least one disposal uses 30-day matching to shares acquired after the disposal date. Use the matching subtable on the CGT summary row for that disposal date.',
    );
  }

  const anyFallback =
    Object.values(fxByAcquisitionId).some((f) => f.usedFallback) ||
    Object.values(fxByDisposalId).some((f) => f.usedFallback);

  if (anyFallback) {
    warnings.push(
      'At least one USD conversion used a fallback rate date. Check FX applied for details.',
    );
  }

  return dedupeStrings(warnings);
}

export function mergeCalculationWarnings(material: readonly string[]): readonly string[] {
  return dedupeStrings([...STATIC_TABLE_INTERPRETATION_WARNINGS, ...material]);
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
