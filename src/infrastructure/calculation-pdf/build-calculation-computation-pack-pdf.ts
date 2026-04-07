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

import { linesFromJspdfSplitTextToSize } from './lines-from-jspdf-split-text-to-size';

const MARGIN_MM = 14;
const PAGE_BOTTOM_MM = 297 - MARGIN_MM;
const LINE_HEIGHT = 5;
const FONT_BODY = 9;
const FONT_SMALL = 8;
/** Section title under a date block (“Outcomes”) — larger than outcome sub-headings. */
const FONT_OUTCOMES_SECTION = 11;

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

function ensureSpace(doc: jsPDF, currentY: number, neededMm: number): number {
  if (currentY + neededMm > PAGE_BOTTOM_MM) {
    doc.addPage();
    return MARGIN_MM;
  }
  return currentY;
}

function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return linesFromJspdfSplitTextToSize(doc.splitTextToSize(text, maxWidth));
}

function writeWrappedLines(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  const lines = splitTextToLines(doc, text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * LINE_HEIGHT;
}

function addTitleBlock(doc: jsPDF, holdingSymbol: string, generatedAt: Date): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxW = pageWidth - MARGIN_MM * 2;
  let y = MARGIN_MM;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
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
  const fxNote =
    'Sterling amounts for USD-denominated ledger rows use Bank of England USD/GBP (XUDLUSS) spot rates.';
  /** Extra space before the first tax year section (body starts below the header block). */
  const gapAfterFxNoteMm = 12;
  y = writeWrappedLines(doc, fxNote, MARGIN_MM, y + 2, maxW) + gapAfterFxNoteMm;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(FONT_BODY);

  return y;
}

function addLedgerTable(
  doc: jsPDF,
  rows: readonly (CalculationTransactionLedgerAcquisitionRow | CalculationTransactionLedgerDisposalRow)[],
  startY: number,
): number {
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
    startY,
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
    const t = `Matched to disposal(s) on ${eventDate}: ${m.sameDayQuantity} shares, £${formatGbpAmount(m.sameDayCostGbp)} allowable cost.`;
    y = writeWrappedLines(doc, t, MARGIN_MM, y, maxW) + 4;
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
    y = writeWrappedLines(doc, intro, MARGIN_MM, y, maxW) + 4;

    const thirtyRows = sortedThirtyDayByDisposal(m);
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
      margin: { left: MARGIN_MM, right: MARGIN_MM },
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
  const poolText = `Unmatched portion after identification: ${m.netToPoolQuantity} shares, £${formatGbpAmount(m.netToPoolCostGbp)}. This is what the pool totals in this acquisition summary include from this date.`;
  y = writeWrappedLines(doc, poolText, MARGIN_MM, y, maxW) + 4;

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

  for (const line of lines) {
    y = writeWrappedLines(doc, line, MARGIN_MM, y, maxW);
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_BODY);
  doc.text('Matching', MARGIN_MM, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);

  if (row.acquisitionMatching === undefined) {
    const q = row.totalQuantity;
    const costLabel = formatGbpAmount(row.totalCostGbp);
    let note = `All ${q} shares (£${costLabel}) from this date were added to the Section 104 pool. No same-day or 30-day identification (HMRC matching rules) applied to these acquisitions.`;
    if (row.acquisitionLineCount > 1) {
      note = `Several acquisition entries on this date are listed separately in the ledger for this date; this summary aggregates their sterling totals. ${note}`;
    }
    y = writeWrappedLines(doc, note, MARGIN_MM, y, maxW) + 4;
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

  for (const line of summaryLines) {
    y = writeWrappedLines(doc, line, MARGIN_MM, y, maxW);
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_BODY);
  doc.text('Matching', MARGIN_MM, y);
  y += LINE_HEIGHT + 2;
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
    margin: { left: MARGIN_MM, right: MARGIN_MM },
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
  doc.setFontSize(FONT_BODY);
  doc.text(`Date ${block.eventDate}`, MARGIN_MM, y);
  y += LINE_HEIGHT + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SMALL);
  doc.text('Ledger (USD reference; CGT amounts in sterling)', MARGIN_MM, y);
  y += LINE_HEIGHT + 2;

  y = addLedgerTable(doc, block.ledgerRows, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_OUTCOMES_SECTION);
  y = ensureSpace(doc, y, 14);
  doc.text('Outcomes', MARGIN_MM, y);
  y += LINE_HEIGHT + 4;
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
  doc.setFontSize(14);
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

  const bulletIndent = MARGIN_MM + 4;
  const poolLines = [
    `• Pool shares: ${group.openingPoolShares}`,
    `• Pool cost (£): £${formatGbpAmount(group.openingPoolCostGbp)}`,
    `• Average cost/share (£): ${formatAvgCostPerShareGbp(group.openingPoolShares, group.openingPoolCostGbp)}`,
  ];
  for (const line of poolLines) {
    y = writeWrappedLines(doc, line, bulletIndent, y, maxW - 4);
  }
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
