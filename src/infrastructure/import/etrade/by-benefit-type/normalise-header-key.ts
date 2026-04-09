/**
 * Normalises a spreadsheet header cell for comparison: trim, NBSP→space, collapse spaces, lowercase,
 * strip trailing `(USD)`-style suffixes and full stops.
 */
export function normaliseHeaderKey(raw: string): string {
  let s = raw
    .replace(/\u00a0/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, ' ');
  for (let i = 0; i < 3; i++) {
    const next = s
      .replace(/\s*\([^)]{0,120}\)\s*$/u, '')
      .replace(/\s*\[[^\]]{0,120}\]\s*$/u, '')
      .replace(/\.+$/u, '')
      .trim();
    if (next === s) {
      break;
    }
    s = next;
  }
  return s;
}

/**
 * Per-parse memo for {@link normaliseHeaderKey} — header cells repeat often in wide sheets.
 */
export function createNormaliseHeaderKeyMemo(): (raw: string) => string {
  const cache = new Map<string, string>();
  return (raw: string): string => {
    const hit = cache.get(raw);
    if (hit !== undefined) {
      return hit;
    }
    const v = normaliseHeaderKey(raw);
    cache.set(raw, v);
    return v;
  };
}
