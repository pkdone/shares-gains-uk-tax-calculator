import type {
  CalculationLedgerLine,
  FxAppliedToAcquisition,
  FxAppliedToDisposal,
} from '@/application/calculation/calculation-types';
/**
 * Warnings when the calculation table layout could hide or obscure material facts.
 */
export function buildMaterialCalculationWarnings(params: {
  readonly ledgerLines: readonly CalculationLedgerLine[];
  readonly fxByAcquisitionId: Readonly<Record<string, FxAppliedToAcquisition>>;
  readonly fxByDisposalId: Readonly<Record<string, FxAppliedToDisposal>>;
}): readonly string[] {
  const { ledgerLines, fxByAcquisitionId, fxByDisposalId } = params;
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

  const mixedAcqDispDates: string[] = [];

  for (const [date, lines] of [...linesByDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const hasAcquisition = lines.some((l) => l.kind === 'ACQUISITION');
    const hasDisposal = lines.some((l) => l.kind === 'DISPOSAL');
    if (hasAcquisition && hasDisposal) {
      mixedAcqDispDates.push(date);
    }
  }

  if (mixedAcqDispDates.length > 0) {
    warnings.push(
      `These dates have both acquisitions and disposals: ${mixedAcqDispDates.join(', ')}. Each acquisition line shows that entry’s cost; only the unmatched amount is added to the Section 104 pool after same-day matching for that date.`,
    );
  }

  const fxFallback = buildFxFallbackWarning({ fxByAcquisitionId, fxByDisposalId });
  if (fxFallback !== null) {
    warnings.push(fxFallback);
  }

  return dedupeStrings(warnings);
}

function buildFxFallbackWarning(params: {
  readonly fxByAcquisitionId: Readonly<Record<string, FxAppliedToAcquisition>>;
  readonly fxByDisposalId: Readonly<Record<string, FxAppliedToDisposal>>;
}): string | null {
  const { fxByAcquisitionId, fxByDisposalId } = params;

  const acqDates = uniqueSortedDates(
    Object.values(fxByAcquisitionId)
      .filter((f) => f.usedFallback)
      .map((f) => f.eventDate),
  );
  const dispDates = uniqueSortedDates(
    Object.values(fxByDisposalId)
      .filter((f) => f.usedFallback)
      .map((f) => f.eventDate),
  );

  if (acqDates.length === 0 && dispDates.length === 0) {
    return null;
  }

  const parts: string[] = [];
  if (acqDates.length > 0) {
    parts.push(`acquisitions on ${acqDates.join(', ')}`);
  }
  if (dispDates.length > 0) {
    parts.push(`disposals on ${dispDates.join(', ')}`);
  }

  return `USD conversions used a Bank of England rate published on an earlier calendar date than the transaction (weekend or holiday fallback) for: ${parts.join('; ')}. Open “Daily FX rates applied” above and use “View FX applied (USD)” to see the rate date used on each row.`;
}

function uniqueSortedDates(dates: readonly string[]): string[] {
  return [...new Set(dates)].sort((a, b) => a.localeCompare(b));
}

/**
 * Final warning list for the calculation result (material warnings only; table interpretation
 * copy lives in the collapsible help sections on the calculation page).
 */
export function mergeCalculationWarnings(material: readonly string[]): readonly string[] {
  return dedupeStrings([...material]);
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
