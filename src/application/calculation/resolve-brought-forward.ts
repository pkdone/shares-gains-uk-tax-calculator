/**
 * Brought-forward losses from URL `bf` only. When `bf` is absent or empty, returns 0.
 */
export function resolveBroughtForwardFromQuery(params: {
  readonly hasBfQuery: boolean;
  readonly queryBfParsed: number;
}): number {
  if (params.hasBfQuery) {
    return Number.isFinite(params.queryBfParsed) ? Math.max(0, params.queryBfParsed) : 0;
  }

  return 0;
}
