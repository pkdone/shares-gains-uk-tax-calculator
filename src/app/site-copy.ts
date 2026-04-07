/** Product name for document titles, auth eyebrows, and marketing-adjacent UI. */
export const siteTitle = 'Shares Gains UK Tax Calculator';

export function holdingDocumentTitle(symbol: string, viewSuffix: 'Ledger' | 'Capital Gains'): string {
  return `${symbol} — ${viewSuffix} | ${siteTitle}`;
}
