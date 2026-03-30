/**
 * URL `bf` overrides persisted portfolio defaults when present (non-empty query).
 */
export function resolveBroughtForwardFromQueryAndPrefs(params: {
  readonly hasBfQuery: boolean;
  readonly queryBfParsed: number;
  readonly storedBroughtForwardLossesGbp: number | undefined;
}): number {
  if (params.hasBfQuery) {
    return Number.isFinite(params.queryBfParsed) ? Math.max(0, params.queryBfParsed) : 0;
  }

  return params.storedBroughtForwardLossesGbp ?? 0;
}
