import type { FxRate } from '@/domain/schemas/fx-rate';
import { ImportError } from '@/shared/errors/app-error';

const BOE_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_TO_NUM: Readonly<Record<string, string>> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

function monthToBoE(monthIndexUtc: number): string {
  const m = BOE_MONTHS[monthIndexUtc];
  if (m === undefined) {
    throw new ImportError('Invalid month index for BoE date range');
  }

  return m;
}

/**
 * Bank of England Statistical Interactive Database — XUDLUSS (US $ into Sterling), CSV/HTML export.
 * The endpoint is not a versioned API; see ADR-008.
 */
export function buildBoeXudlusUrl(params: { readonly from: Date; readonly to: Date }): string {
  const base = 'https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp';
  const sp = new URLSearchParams();
  sp.set('Travel', 'NIxAZxSUx');
  sp.set('FromSeries', '1');
  sp.set('ToSeries', '50');
  sp.set('DAT', 'RNG');
  sp.set('SeriesCodes', 'XUDLUSS');
  sp.set('UsingCodes', 'Y');
  sp.set('Filter', 'N');
  sp.set('title', 'XUDLUSS');
  sp.set('VPD', 'Y');
  sp.set('CSVF', 'TN');
  /** Simulates the "Export" control on the BoE page; without this, the server returns the shell HTML only (no data rows). */
  sp.set('html.x', '66');
  sp.set('html.y', '26');
  sp.set('FD', String(params.from.getUTCDate()));
  sp.set('FM', monthToBoE(params.from.getUTCMonth()));
  sp.set('FY', String(params.from.getUTCFullYear()));
  sp.set('FNY', 'Y');
  sp.set('TD', String(params.to.getUTCDate()));
  sp.set('TM', monthToBoE(params.to.getUTCMonth()));
  sp.set('TY', String(params.to.getUTCFullYear()));
  return `${base}?${sp.toString()}`;
}

/**
 * Parses BoE date cells such as `02 Jan 24` or `2 January 2024` into ISO `YYYY-MM-DD` (UTC calendar).
 */
export function parseBoeDateCell(cell: string): string | null {
  const s = cell.trim();
  const twoDigitYear = /^(\d{1,2}) (\w{3}) (\d{2})$/.exec(s);
  if (twoDigitYear !== null) {
    const day = twoDigitYear[1].padStart(2, '0');
    const mon = MONTH_TO_NUM[twoDigitYear[2]];
    if (mon === undefined) {
      return null;
    }

    const yy = Number(twoDigitYear[3]);
    const year = 2000 + yy;
    return `${year}-${mon}-${day}`;
  }

  const fourDigitYear = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(s);
  if (fourDigitYear !== null) {
    const day = fourDigitYear[1].padStart(2, '0');
    const mon = MONTH_TO_NUM[fourDigitYear[2]];
    if (mon === undefined) {
      return null;
    }

    const year = fourDigitYear[3];
    return `${year}-${mon}-${day}`;
  }

  const longMonth = /^(\d{1,2}) (\w+) (\d{4})$/.exec(s);
  if (longMonth !== null) {
    const abbr = longMonth[2].slice(0, 3);
    const mon = MONTH_TO_NUM[abbr];
    if (mon === undefined) {
      return null;
    }

    const day = longMonth[1].padStart(2, '0');
    return `${longMonth[3]}-${mon}-${day}`;
  }

  return null;
}

function cellText(htmlCell: string): string {
  return htmlCell.replace(/<[^>]+>/g, '').trim();
}

/**
 * Extracts date/rate rows from BoE HTML table export.
 */
export function parseBoeHtmlTable(html: string): FxRate[] {
  const out: FxRate[] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let rowMatch: RegExpExecArray | null = rowRegex.exec(html);
  while (rowMatch !== null) {
    const row = rowMatch[0];
    const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null = tdRegex.exec(row);
    while (cellMatch !== null) {
      cells.push(cellText(cellMatch[1]));
      cellMatch = tdRegex.exec(row);
    }

    if (cells.length >= 2) {
      const dateText = cells[0];
      const rateText = cells[1];
      if (dateText === 'Date' || dateText.includes('Spot exchange')) {
        rowMatch = rowRegex.exec(html);
        continue;
      }

      const iso = parseBoeDateCell(dateText);
      const rate = Number(rateText.replace(/,/g, ''));
      if (iso !== null && Number.isFinite(rate) && rate > 0) {
        out.push({ date: iso, usdPerGbp: rate });
      }
    }

    rowMatch = rowRegex.exec(html);
  }

  return dedupeSortedRates(out);
}

function parseBoeCsvLike(text: string): FxRate[] {
  const out: FxRate[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const parts = trimmed.split(/\t|,/).map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 2) {
      continue;
    }

    const dateRaw = parts[0];
    const rateRaw = parts[1];
    if (dateRaw === 'Date' || !/^\d/.exec(dateRaw)) {
      continue;
    }

    const iso = parseBoeDateCell(dateRaw);
    const rate = Number(rateRaw.replace(/,/g, ''));
    if (iso !== null && Number.isFinite(rate) && rate > 0) {
      out.push({ date: iso, usdPerGbp: rate });
    }
  }

  return dedupeSortedRates(out);
}

function dedupeSortedRates(rates: FxRate[]): FxRate[] {
  const map = new Map<string, FxRate>();
  for (const r of rates) {
    map.set(r.date, r);
  }

  return [...map.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((d) => map.get(d))
    .filter((r): r is FxRate => r !== undefined);
}

/**
 * Parses BoE XUDLUSS export body (HTML table or CSV-like text).
 */
export function parseBoeXudlusResponse(body: string): FxRate[] {
  const trimmed = body.trim();
  if (trimmed.includes('<tr')) {
    return parseBoeHtmlTable(trimmed);
  }

  return parseBoeCsvLike(trimmed);
}

export async function fetchBoeXudlusRates(params: {
  readonly from: Date;
  readonly to: Date;
  readonly fetchFn?: typeof fetch;
}): Promise<FxRate[]> {
  const url = buildBoeXudlusUrl(params);
  const fetchImpl = params.fetchFn ?? globalThis.fetch;
  const res = await fetchImpl(url, {
    headers: {
      Accept: 'text/html,text/csv,*/*',
      'User-Agent': 'shares-gains-uk-tax-calculator/1.0 (+https://github.com/)',
    },
  });

  if (!res.ok) {
    throw new ImportError(`Bank of England XUDLUSS request failed: HTTP ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  if (text.trim().length === 0) {
    throw new ImportError('Bank of England returned an empty XUDLUSS response');
  }

  const rates = parseBoeXudlusResponse(text);
  if (rates.length === 0) {
    throw new ImportError(
      'No XUDLUSS rates parsed from Bank of England response. The export format may have changed — inspect ADR-008 and update parseBoeXudlusResponse.',
    );
  }

  return rates;
}
