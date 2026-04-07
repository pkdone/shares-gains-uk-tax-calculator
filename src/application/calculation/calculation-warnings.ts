import type { CalculationLedgerLine } from '@/application/calculation/calculation-types';
/**
 * Warnings when the calculation table layout could hide or obscure material facts.
 */
export function buildMaterialCalculationWarnings(params: {
  readonly ledgerLines: readonly CalculationLedgerLine[];
}): readonly string[] {
  const { ledgerLines } = params;
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

  return dedupeStrings(warnings);
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
