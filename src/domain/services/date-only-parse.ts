const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_WITH_TIME = /^(\d{4}-\d{2}-\d{2})(?:[T\s].+)?$/u;
const US_SLASH = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
/** US locale short year (common in Excel cell formats), e.g. `10/1/18`. */
const US_SLASH_SHORT_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
const D_MON_Y = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
const D_MON_SHORT_YEAR = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/;

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** `October 1, 2018` and `Oct 1, 2018` (Excel long-month display formats). */
const MONTH_DAY_YEAR_COMMA = /^([A-Za-z]+)\s+(\d{1,2})\s*,\s*(\d{4})$/u;
/** `1 October 2018` */
const DAY_MONTH_YEAR = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/u;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Two-digit years: 00–69 → 2000–2069, 70–99 → 1970–1999 (Excel-style pivot). */
function expandTwoDigitYear(yy: number): number {
  if (yy >= 0 && yy <= 69) {
    return 2000 + yy;
  }
  if (yy >= 70 && yy <= 99) {
    return 1900 + yy;
  }
  return yy;
}

/**
 * Parses common date-only strings from spreadsheets into `YYYY-MM-DD` (UTC calendar semantics).
 */
export function parseFlexibleDateOnly(raw: string): string | null {
  const s = raw.trim();
  if (s.length === 0) {
    return null;
  }

  if (ISO_DATE.test(s)) {
    return s;
  }

  const isoWithTime = ISO_DATE_WITH_TIME.exec(s);
  if (isoWithTime !== null) {
    return isoWithTime[1];
  }

  const us = US_SLASH.exec(s);
  if (us !== null) {
    const mm = Number(us[1]);
    const dd = Number(us[2]);
    const yyyy = Number(us[3]);
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
      return null;
    }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      return null;
    }
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  const usShort = US_SLASH_SHORT_YEAR.exec(s);
  if (usShort !== null) {
    const mm = Number(usShort[1]);
    const dd = Number(usShort[2]);
    const yy = Number(usShort[3]);
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yy)) {
      return null;
    }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      return null;
    }
    const yyyy = expandTwoDigitYear(yy);
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  const dmy = D_MON_Y.exec(s);
  if (dmy !== null) {
    const dd = Number(dmy[1]);
    const mon = MONTHS[dmy[2].toLowerCase()];
    const yyyy = Number(dmy[3]);
    if (mon === undefined || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
      return null;
    }
    if (dd < 1 || dd > 31) {
      return null;
    }
    return `${yyyy}-${pad2(mon + 1)}-${pad2(dd)}`;
  }

  const dmyShort = D_MON_SHORT_YEAR.exec(s);
  if (dmyShort !== null) {
    const dd = Number(dmyShort[1]);
    const mon = MONTHS[dmyShort[2].toLowerCase()];
    let yyyy = Number(dmyShort[3]);
    if (mon === undefined || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
      return null;
    }
    if (dd < 1 || dd > 31) {
      return null;
    }
    if (yyyy < 100) {
      yyyy = expandTwoDigitYear(yyyy);
    }
    return `${yyyy}-${pad2(mon + 1)}-${pad2(dd)}`;
  }

  const mdyComma = MONTH_DAY_YEAR_COMMA.exec(s);
  if (mdyComma !== null) {
    const mon = MONTHS[mdyComma[1].toLowerCase()];
    const dd = Number(mdyComma[2]);
    const yyyy = Number(mdyComma[3]);
    if (mon === undefined || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
      return null;
    }
    if (dd < 1 || dd > 31) {
      return null;
    }
    return `${yyyy}-${pad2(mon + 1)}-${pad2(dd)}`;
  }

  const dmyLong = DAY_MONTH_YEAR.exec(s);
  if (dmyLong !== null) {
    const dd = Number(dmyLong[1]);
    const mon = MONTHS[dmyLong[2].toLowerCase()];
    const yyyy = Number(dmyLong[3]);
    if (mon === undefined || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
      return null;
    }
    if (dd < 1 || dd > 31) {
      return null;
    }
    return `${yyyy}-${pad2(mon + 1)}-${pad2(dd)}`;
  }

  return null;
}

/**
 * Excel stores dates as serial days since 1899-12-30 (with JS-friendly UTC math). Typical values for
 * 1990–2035 are ~33000–47000. Avoids misreading share quantities (e.g. 1875) as dates.
 */
function excelSerialToDateOnly(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 32000 || serial > 55000) {
    return null;
  }
  const epochMs = Date.UTC(1899, 11, 30);
  const ms = epochMs + Math.round(serial) * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  if (y < 1980 || y > 2045) {
    return null;
  }
  return `${y}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Parses a spreadsheet cell that may be a formatted date string or an Excel serial number.
 */
export function tryParseSpreadsheetDateCell(raw: string): string | null {
  const t = raw.trim();
  if (t.length === 0) {
    return null;
  }
  const fromText = parseFlexibleDateOnly(t);
  if (fromText !== null) {
    return fromText;
  }
  const n = Number(t.replace(/,/gu, ''));
  if (!Number.isFinite(n)) {
    return null;
  }
  return excelSerialToDateOnly(n);
}
