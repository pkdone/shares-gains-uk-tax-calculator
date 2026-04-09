import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';

import type {
  CalculationTransactionAcquisitionAggregateSummaryRow,
  CalculationTransactionCgtDisposalSummaryRow,
  CalculationTransactionDateBlock,
  CalculationTransactionLedgerAcquisitionRow,
  CalculationTransactionLedgerDisposalRow,
  CalculationTransactionOutcomeRow,
  CalculationTransactionTableGroup,
} from '@/application/calculation/build-calculation-transaction-table';
import { formatGbpAmount, formatUsdCurrency } from '@/application/calculation/calculation-amount-format';
import type { AcquisitionMatchingAttribution } from '@/application/calculation/acquisition-matching-attribution';
import type { MatchingSource } from '@/domain/schemas/calculation';
import { formatUkTaxYearLabelForDisplay } from '@/domain/services/uk-tax-year';
import { CALCULATION_EXPORT_FX_ASSUMPTION_NOTE } from '@/shared/calculation-export-fx-assumption-note';

import { linesFromJspdfSplitTextToSize } from './lines-from-jspdf-split-text-to-size';

const MARGIN_MM = 14;
/**
 * Extra horizontal inset for acquisition/disposal matching tables so they look embedded under
 * “Matching”, not full-width like the main ledger.
 */
const MATCHING_TABLE_INSET_MM = 6;
const LINE_HEIGHT = 5;
/** Reserve space for “Matching” heading + gap + at least one table header/body (mm). */
const MIN_SPACE_MATCHING_HEADING_AND_TABLE_MM = 46;
/** Body and standard bold labels (CGT summary titles, “Matching”, etc.). */
const FONT_BODY = 9;
/** Tables, ledger caption, matching sub-headings (“Same-day identification”, …). */
const FONT_SMALL = 8;
/** Bullet + following space for summary lists (PDF). */
const BULLET_PREFIX = '\u2022 ';
/**
 * Heading scale (pt, larger = more prominent). Keeps each level visually below its parent.
 * Document title → tax year → date within year → outcomes group → outcome cards → body.
 */
const FONT_DOC_TITLE = 16;
const FONT_TAX_YEAR_TITLE = 14;
/** “Date YYYY-MM-DD” — main subsection within a tax year (above “Outcomes”). */
const FONT_DATE_BLOCK_TITLE = 12;
/** “Outcomes” — groups outcome cards under a date (below date title, above CGT summaries). */
const FONT_OUTCOMES_SECTION = 10;

function formatMatchingSourceLabel(source: MatchingSource): string {
  switch (source) {
    case 'same-day':
      return 'Same day';
    case 'thirty-day':
      return '30-day';
    case 'section-104-pool':
      return 'Section 104 pool';
  }
}

function formatAvgCostPerShareGbp(poolShares: number, poolCostGbp: number): string {
  if (poolShares <= 0 || !Number.isFinite(poolCostGbp)) {
    return '—';
  }

  return `£${formatGbpAmount(poolCostGbp / poolShares)}`;
}

function sortedThirtyDayByDisposal(m: AcquisitionMatchingAttribution) {
  return [...m.thirtyDayByDisposal].sort((a, b) => a.disposalDate.localeCompare(b.disposalDate));
}

function getFinalY(doc: jsPDF): number {
  const y = doc.lastAutoTable?.finalY;
  if (y === undefined) {
    return MARGIN_MM;
  }
  return y;
}

/**
 * Page margins for embedded matching tables (indented, narrower than full body width).
 * Top/bottom are explicit so jspdf-autotable does not fill missing sides with its large default (~14mm).
 */
function matchingTableMargins(): {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
} {
  const side = MARGIN_MM + MATCHING_TABLE_INSET_MM;
  return {
    left: side,
    right: side,
    top: 0,
    bottom: 0,
  };
}

function pageContentBottomMm(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - MARGIN_MM;
}

function ensureSpace(doc: jsPDF, currentY: number, neededMm: number): number {
  if (currentY + neededMm > pageContentBottomMm(doc)) {
    doc.addPage();
    return MARGIN_MM;
  }
  return currentY;
}

function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return linesFromJspdfSplitTextToSize(doc.splitTextToSize(text, maxWidth));
}

/** jsPDF multi-line `text()` line height in mm (matches `getLineHeight()` / scale factor). */
function lineHeightMm(doc: jsPDF): number {
  const scaleFactor = doc.internal.scaleFactor;
  return doc.getLineHeight() / scaleFactor;
}

function writeWrappedLines(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const lines = splitTextToLines(doc, text, maxWidth);
  const lh = lineHeightMm(doc);
  const bottom = pageContentBottomMm(doc);
  let cy = y;
  for (const line of lines) {
    if (cy + lh > bottom) {
      doc.addPage();
      cy = MARGIN_MM;
    }
    doc.text(line, x, cy);
    cy += lh;
  }
  return cy;
}

/** Renders each item as a bullet; wrapped continuation lines align with the text column. */
function writeWrappedBulletLines(
  doc: jsPDF,
  items: readonly string[],
  x: number,
  startY: number,
  maxWidth: number,
  bodyFontSize: number = FONT_BODY,
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);
  const bulletW = doc.getTextWidth(BULLET_PREFIX);
  const textColumnWidth = maxWidth - bulletW;
  let y = startY;
  const lh = lineHeightMm(doc);
  const bottom = pageContentBottomMm(doc);

  for (const item of items) {
    const wrapped = splitTextToLines(doc, item, textColumnWidth);
    for (let i = 0; i < wrapped.length; i++) {
      const line = wrapped[i];
      if (line === undefined) {
        continue;
      }
      if (y + lh > bottom) {
        doc.addPage();
        y = MARGIN_MM;
      }
      if (i === 0) {
        doc.text(BULLET_PREFIX, x, y);
        doc.text(line, x + bulletW, y);
      } else {
        doc.text(line, x + bulletW, y);
      }
      y += lh;
    }
  }

  return y;
}

type RichTextWord = { readonly text: string; readonly bold: boolean };

/** Word-wraps a line with mixed normal/bold segments (used for acquisition pool matching copy). */
function writeWrappedRichWords(
  doc: jsPDF,
  words: readonly RichTextWord[],
  x: number,
  startY: number,
  maxWidth: number,
): number {
  doc.setFontSize(FONT_BODY);
  let y = startY;
  const lh = lineHeightMm(doc);
  let line: RichTextWord[] = [];

  const flushLine = (): void => {
    if (line.length === 0) {
      return;
    }
    if (y + lh > pageContentBottomMm(doc)) {
      doc.addPage();
      y = MARGIN_MM;
    }
    let cx = x;
    for (let i = 0; i < line.length; i++) {
      if (i > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text(' ', cx, y);
        cx += doc.getTextWidth(' ');
      }
      const p = line[i];
      if (p === undefined) {
        continue;
      }
      doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
      doc.text(p.text, cx, y);
      cx += doc.getTextWidth(p.text);
    }
    y += lh;
    line = [];
  };

  const lineWidth = (parts: readonly RichTextWord[]): number => {
    let total = 0;
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        doc.setFont('helvetica', 'normal');
        total += doc.getTextWidth(' ');
      }
      const p = parts[i];
      doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
      total += doc.getTextWidth(p.text);
    }
    return total;
  };

  for (const w of words) {
    if (line.length === 0) {
      line = [w];
      continue;
    }
    const trial = [...line, w];
    if (lineWidth(trial) <= maxWidth) {
      line = trial;
    } else {
      flushLine();
      line = [w];
    }
  }
  flushLine();
  doc.setFont('helvetica', 'normal');
  return y;
}

function acquisitionPoolMatchingFallbackWords(row: CalculationTransactionAcquisitionAggregateSummaryRow): RichTextWord[] {
  const q = row.totalQuantity;
  const costLabel = formatGbpAmount(row.totalCostGbp);
  const tail =
    `shares (£${costLabel}) from this date were added to the Section 104 pool. No same-day or 30-day identification under HMRC matching rules applied to these acquisitions.`;
  const words: RichTextWord[] = [];
  if (row.acquisitionLineCount > 1) {
    const prefix =
      'Several acquisition entries on this date are listed separately in the ledger for this date; this summary aggregates their sterling totals.';
    for (const t of prefix.split(/\s+/)) {
      if (t.length > 0) {
        words.push({ text: t, bold: false });
      }
    }
  }
  words.push({ text: 'All', bold: false });
  words.push({ text: String(q), bold: true });
  for (const t of tail.split(/\s+/)) {
    if (t.length > 0) {
      words.push({ text: t, bold: false });
    }
  }
  return words;
}

function pushWordsFromString(text: string, bold: boolean, into: RichTextWord[]): void {
  for (const t of text.trim().split(/\s+/)) {
    if (t.length > 0) {
      into.push({ text: t, bold });
    }
  }
}

function sameDayIdentificationRichWords(
  eventDate: string,
  sameDayQuantity: number,
  sameDayCostGbp: number,
): RichTextWord[] {
  const words: RichTextWord[] = [];
  pushWordsFromString('Matched to disposal(s) on', false, words);
  words.push({ text: `${eventDate}:`, bold: false });
  words.push({ text: String(sameDayQuantity), bold: true });
  words.push({ text: 'shares,', bold: false });
  words.push({ text: `£${formatGbpAmount(sameDayCostGbp)}`, bold: true });
  pushWordsFromString('allowable cost.', false, words);
  return words;
}

function netIncreaseToPoolRichWords(m: AcquisitionMatchingAttribution): RichTextWord[] {
  const words: RichTextWord[] = [];
  pushWordsFromString('Unmatched portion after identification:', false, words);
  words.push({ text: String(m.netToPoolQuantity), bold: true });
  words.push({ text: 'shares,', bold: false });
  words.push({ text: `£${formatGbpAmount(m.netToPoolCostGbp)}.`, bold: true });
  pushWordsFromString('This is what the pool totals in this acquisition summary include from this date.', false, words);
  return words;
}

function addTitleBlock(doc: jsPDF, holdingSymbol: string, generatedAt: Date): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - MARGIN_MM * 2;
  let y = MARGIN_MM;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_DOC_TITLE);
  doc.text('Holding capital gains report', MARGIN_MM, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);
  doc.text(`Holding: ${holdingSymbol}`, MARGIN_MM, y);
  y += LINE_HEIGHT;

  const generatedLabel = `Generated: ${generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  doc.text(generatedLabel, MARGIN_MM, y);
  y += LINE_HEIGHT;

  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(60, 60, 60);
  /** Extra space before the first tax year section (body starts below the header block). */
  const gapAfterFxNoteMm = 12;
  y = writeWrappedLines(doc, CALCULATION_EXPORT_FX_ASSUMPTION_NOTE, MARGIN_MM, y + 2, maxW) + gapAfterFxNoteMm;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(FONT_BODY);

  return y;
}

function addLedgerTable(
  doc: jsPDF,
  rows: readonly (CalculationTransactionLedgerAcquisitionRow | CalculationTransactionLedgerDisposalRow)[],
  startY: number,
): number {
  const startYSafe = ensureSpace(doc, startY, 22);
  const head = [
    [
      'Type',
      'Date',
      'Shares',
      'Price/share ($)',
      'Cost / net ($)',
      'FX rate',
      'Cost / net (£)',
    ],
  ];

  const body = rows.map((row) => {
    if (row.rowKind === 'ledger-acquisition') {
      const { sterling } = row;
      return [
        'Acquisition',
        row.eventDate,
        String(row.quantity),
        formatUsdCurrency(row.pricePerShareUsd),
        formatUsdCurrency(row.combinedUsd),
        row.fxRate === undefined ? '—' : row.fxRate.toFixed(4),
        `£${formatGbpAmount(sterling.totalCostGbp)}`,
      ];
    }

    const { sterling } = row;
    const netGbp = sterling.grossProceedsGbp - sterling.feesGbp;
    return [
      'Disposal',
      row.eventDate,
      String(row.quantity),
      formatUsdCurrency(row.pricePerShareUsd),
      formatUsdCurrency(row.combinedUsd),
      row.fxRate === undefined ? '—' : row.fxRate.toFixed(4),
      `£${formatGbpAmount(netGbp)}`,
    ];
  });

  autoTable(doc, {
    startY: startYSafe,
    head,
    body,
    styles: { fontSize: FONT_SMALL, cellPadding: 1.5 },
    headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40] },
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    showHead: 'everyPage',
    tableWidth: 'wrap',
    horizontalPageBreak: true,
  });

  return getFinalY(doc) + 6;
}

function addAcquisitionMatchingTables(
  doc: jsPDF,
  m: AcquisitionMatchingAttribution,
  eventDate: string,
  startY: number,
): number {
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - MARGIN_MM * 2;

  if (m.sameDayQuantity > 0) {
    y = ensureSpace(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SMALL);
    doc.text('Same-day identification', MARGIN_MM, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_BODY);
    y =
      writeWrappedRichWords(
        doc,
        sameDayIdentificationRichWords(eventDate, m.sameDayQuantity, m.sameDayCostGbp),
        MARGIN_MM,
        y,
        maxW,
      ) + 4;
  }

  if (m.thirtyDayQuantity > 0) {
    y = ensureSpace(doc, y, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SMALL);
    doc.text('30-day identification', MARGIN_MM, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_BODY);
    const intro =
      'Matched to earlier disposal(s) under the bed-and-breakfast (30-day) rule. Those shares and their acquisition cost are treated as sold by those disposals.';
    y = writeWrappedLines(doc, intro, MARGIN_MM, y, maxW) + 1;

    const thirtyRows = sortedThirtyDayByDisposal(m);
    y = ensureSpace(doc, y, 34);
    autoTable(doc, {
      startY: y,
      head: [['Earlier disposal date', 'Shares taken', 'Allowable (£)']],
      body: thirtyRows.map((r) => [
        r.disposalDate,
        String(r.quantity),
        `£${formatGbpAmount(r.allowableCostGbp)}`,
      ]),
      foot: [['Total (30-day)', String(m.thirtyDayQuantity), `£${formatGbpAmount(m.thirtyDayCostGbp)}`]],
      styles: { fontSize: FONT_SMALL, cellPadding: 1.5 },
      margin: matchingTableMargins(),
      showFoot: 'lastPage',
    });
    y = getFinalY(doc) + 6;
  }

  y = ensureSpace(doc, y, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_SMALL);
  doc.text('Net increase to Section 104 pool', MARGIN_MM, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);
  y =
    writeWrappedRichWords(doc, netIncreaseToPoolRichWords(m), MARGIN_MM, y, maxW) + 4;

  return y;
}

function addAcquisitionOutcome(
  doc: jsPDF,
  row: CalculationTransactionAcquisitionAggregateSummaryRow,
  startY: number,
): number {
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - MARGIN_MM * 2;

  y = ensureSpace(doc, y, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_BODY);
  doc.text('CGT acquisition summary', MARGIN_MM, y);
  y += LINE_HEIGHT + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);
  const poolShares = row.poolSharesAfter;
  const poolCost = row.poolCostGbpAfter;
  const hasPool = poolShares !== undefined && poolCost !== undefined;

  const lines: string[] = [
    `Shares (total): ${row.totalQuantity}`,
    `Total cost (£): £${formatGbpAmount(row.totalCostGbp)}`,
    `Pool shares: ${hasPool ? String(poolShares) : '—'}`,
    `Pool cost (£): ${hasPool ? `£${formatGbpAmount(poolCost)}` : '—'}`,
    `Average cost/share (£): ${
      hasPool && poolShares !== undefined && poolCost !== undefined
        ? formatAvgCostPerShareGbp(poolShares, poolCost)
        : '—'
    }`,
  ];

  y = writeWrappedBulletLines(doc, lines, MARGIN_MM, y, maxW);

  y += 2;
  y = ensureSpace(doc, y, MIN_SPACE_MATCHING_HEADING_AND_TABLE_MM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_BODY);
  doc.text('Matching', MARGIN_MM, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);

  if (row.acquisitionMatching === undefined) {
    const words = acquisitionPoolMatchingFallbackWords(row);
    y = writeWrappedRichWords(doc, words, MARGIN_MM, y, maxW) + 4;
  } else {
    y = addAcquisitionMatchingTables(doc, row.acquisitionMatching, row.eventDate, y);
  }

  return y;
}

function addCgtDisposalOutcome(
  doc: jsPDF,
  row: CalculationTransactionCgtDisposalSummaryRow,
  startY: number,
): number {
  const r = row.result;
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - MARGIN_MM * 2;

  y = ensureSpace(doc, y, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_BODY);
  doc.text('CGT disposal summary', MARGIN_MM, y);
  y += LINE_HEIGHT + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);
  const summaryPricePerShare = r.grossProceedsGbp / r.quantity;
  const netProceeds = r.grossProceedsGbp - r.disposalFeesGbp;

  const summaryLines = [
    `Shares (disposed): ${r.quantity}`,
    `Price/share (£): £${formatGbpAmount(summaryPricePerShare)}`,
    `Gross (£): £${formatGbpAmount(r.grossProceedsGbp)}`,
    `Fees (£): £${formatGbpAmount(r.disposalFeesGbp)}`,
    `Net proceeds (£): £${formatGbpAmount(netProceeds)}`,
    `Allowable cost (£): £${formatGbpAmount(r.allowableCostGbp)}`,
    `Gain/loss (£): £${formatGbpAmount(r.gainOrLossGbp)}`,
    `Pool shares: ${r.poolSharesAfter}`,
    `Pool cost (£): £${formatGbpAmount(r.poolCostGbpAfter)}`,
    `Avg cost/share (£): ${formatAvgCostPerShareGbp(r.poolSharesAfter, r.poolCostGbpAfter)}`,
  ];

  y = writeWrappedBulletLines(doc, summaryLines, MARGIN_MM, y, maxW);

  y += 2;
  y = ensureSpace(doc, y, MIN_SPACE_MATCHING_HEADING_AND_TABLE_MM);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_BODY);
  doc.text('Matching', MARGIN_MM, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);

  autoTable(doc, {
    startY: y,
    head: [['Source', 'Acq. lot date', 'Shares', 'Allowable (£)']],
    body: r.matchingBreakdown.map((t) => [
      formatMatchingSourceLabel(t.source),
      t.acquisitionDate ?? '—',
      String(t.quantity),
      `£${formatGbpAmount(t.allowableCostGbp)}`,
    ]),
    styles: { fontSize: FONT_SMALL, cellPadding: 1.5 },
    margin: matchingTableMargins(),
    showHead: 'everyPage',
    horizontalPageBreak: true,
  });

  return getFinalY(doc) + 6;
}

function addOutcomes(
  doc: jsPDF,
  outcomes: readonly CalculationTransactionOutcomeRow[],
  startY: number,
): number {
  let y = startY;

  for (const outcome of outcomes) {
    if (outcome.rowKind === 'acquisition-aggregate-summary') {
      y = addAcquisitionOutcome(doc, outcome, y);
      continue;
    }

    if (outcome.rowKind === 'cgt-disposal-summary') {
      y = addCgtDisposalOutcome(doc, outcome, y);
    }
  }

  return y;
}

function addDateBlock(doc: jsPDF, block: CalculationTransactionDateBlock, startY: number): number {
  let y = ensureSpace(doc, startY, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_DATE_BLOCK_TITLE);
  doc.text(`Date ${block.eventDate}`, MARGIN_MM, y);
  y += LINE_HEIGHT + 1;

  y = addLedgerTable(doc, block.ledgerRows, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_OUTCOMES_SECTION);
  y = ensureSpace(doc, y, 14);
  doc.text('Outcomes', MARGIN_MM, y);
  y += LINE_HEIGHT + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);

  y = addOutcomes(doc, block.outcomes, y);
  y += 4;

  return y;
}

function addTaxYearGroup(
  doc: jsPDF,
  group: CalculationTransactionTableGroup,
  holdingSymbol: string,
  startY: number,
): number {
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - MARGIN_MM * 2;

  y = ensureSpace(doc, y, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_TAX_YEAR_TITLE);
  const tyDisplay = formatUkTaxYearLabelForDisplay(group.taxYearLabel);
  doc.text(`Tax year ${tyDisplay}`, MARGIN_MM, y);
  y += 10;

  doc.setFontSize(FONT_BODY);
  doc.text(
    `Net realised gain/loss for ${holdingSymbol} holding (GBP): £${formatGbpAmount(group.totalNetRealisedGainOrLossGbp)}`,
    MARGIN_MM,
    y,
  );
  y += LINE_HEIGHT + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SMALL);
  const poolIntro =
    'Section 104 pool at the start of this tax year (6 April), after all earlier recorded events for this holding:';
  y = writeWrappedLines(doc, poolIntro, MARGIN_MM, y, maxW) + 1;

  const poolLines = [
    `Pool shares: ${group.openingPoolShares}`,
    `Pool cost (£): £${formatGbpAmount(group.openingPoolCostGbp)}`,
    `Average cost/share (£): ${formatAvgCostPerShareGbp(group.openingPoolShares, group.openingPoolCostGbp)}`,
  ];
  y = writeWrappedBulletLines(doc, poolLines, MARGIN_MM, y, maxW, FONT_SMALL);
  y += 8;

  doc.setFontSize(FONT_BODY);
  for (const block of group.dateBlocks) {
    y = addDateBlock(doc, block, y);
  }

  return y;
}

function buildPdfDocument(params: {
  readonly holdingSymbol: string;
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly generatedAt: Date;
}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const { holdingSymbol, groups, generatedAt } = params;

  let y = addTitleBlock(doc, holdingSymbol, generatedAt);

  for (let i = 0; i < groups.length; i += 1) {
    const g = groups[i];
    if (g === undefined) {
      continue;
    }

    if (i > 0) {
      doc.addPage();
      y = MARGIN_MM;
    }

    y = addTaxYearGroup(doc, g, holdingSymbol, y);
  }

  return doc;
}

/**
 * Builds a PDF holding capital gains report for all tax years in order.
 */
export function buildComputationPackPdfAllYears(params: {
  readonly holdingSymbol: string;
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly generatedAt?: Date;
}): Uint8Array {
  const generatedAt = params.generatedAt ?? new Date();
  const doc = buildPdfDocument({
    holdingSymbol: params.holdingSymbol,
    groups: params.groups,
    generatedAt,
  });
  const buf = doc.output('arraybuffer');
  if (!(buf instanceof ArrayBuffer)) {
    throw new Error('Expected ArrayBuffer from jsPDF output');
  }
  return new Uint8Array(buf);
}

/**
 * Builds a PDF holding capital gains report for a single UK tax year.
 */
export function buildComputationPackPdfSingleTaxYear(params: {
  readonly holdingSymbol: string;
  readonly group: CalculationTransactionTableGroup;
  readonly generatedAt?: Date;
}): Uint8Array {
  const generatedAt = params.generatedAt ?? new Date();
  const doc = buildPdfDocument({
    holdingSymbol: params.holdingSymbol,
    groups: [params.group],
    generatedAt,
  });
  const buf = doc.output('arraybuffer');
  if (!(buf instanceof ArrayBuffer)) {
    throw new Error('Expected ArrayBuffer from jsPDF output');
  }
  return new Uint8Array(buf);
}
