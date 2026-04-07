/**
 * Normalises jsPDF `splitTextToSize` output (string or string[]) to a line array for `doc.text`.
 */
export function linesFromJspdfSplitTextToSize(raw: string | string[]): string[] {
  if (typeof raw === 'string') {
    return [raw];
  }

  return raw.map((line) => String(line));
}
