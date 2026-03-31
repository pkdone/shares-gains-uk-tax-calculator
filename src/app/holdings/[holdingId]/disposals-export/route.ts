import { type NextRequest, NextResponse } from 'next/server';

import { resolveBroughtForwardFromQuery } from '@/application/calculation/resolve-brought-forward';
import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { rateTierSchema } from '@/domain/schemas/calculation';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { getVerifiedUserIdFromRequest } from '@/infrastructure/auth/session';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { DomainError } from '@/shared/errors/app-error';

const holdingRepository = new MongoHoldingRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ holdingId: string }> },
): Promise<Response> {
  const { holdingId } = await context.params;
  const sp = req.nextUrl.searchParams;

  const userId = await getVerifiedUserIdFromRequest(req);
  if (userId === null) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const holding = await holdingRepository.findByIdForUser(holdingId, userId);
  if (holding === null) {
    return new NextResponse('Not found', { status: 404 });
  }

  const hasBfQuery = sp.has('bf') && sp.get('bf')?.trim() !== '';
  const bfParsed = Number.parseFloat(sp.get('bf') ?? '0');
  const broughtForwardLosses = resolveBroughtForwardFromQuery({
    hasBfQuery,
    queryBfParsed: bfParsed,
  });

  const symbolFromQuery = sp.get('symbol')?.trim() ?? '';
  const symbol =
    symbolFromQuery.length > 0 ? symbolFromQuery.toUpperCase() : holding.symbol;

  const tierParsed = rateTierSchema.safeParse(sp.get('rateTier') ?? 'additional');
  const rateTier = tierParsed.success ? tierParsed.data : 'additional';

  if (symbol !== holding.symbol) {
    return new NextResponse('Symbol does not match this holding', { status: 400 });
  }

  let result: Awaited<ReturnType<typeof runCalculationForHoldingSymbol>>;
  try {
    result = await runCalculationForHoldingSymbol({
      holdingRepository,
      acquisitionRepository,
      disposalRepository,
      fxRateRepository,
      input: {
        holdingId,
        userId,
        rateTier,
        broughtForwardLosses,
      },
    });
  } catch (err) {
    const message = err instanceof DomainError ? err.message : 'Calculation failed';
    return new NextResponse(message, { status: 400 });
  }

  const header = [
    'symbol',
    'disposal_date',
    'tax_year',
    'quantity',
    'gross_proceeds_gbp',
    'fees_gbp',
    'allowable_cost_gbp',
    'gain_or_loss_gbp',
    'rounded_gain_or_loss_gbp',
    'matching_breakdown',
  ];

  const lines = [header.join(',')];
  for (const row of result.output.disposalResults) {
    const breakdown = row.matchingBreakdown
      .map((t) => `${t.source}:${t.quantity}:${t.allowableCostGbp.toFixed(2)}`)
      .join('; ');
    const cells = [
      csvEscape(symbol),
      csvEscape(row.eventDate),
      csvEscape(row.taxYear),
      String(row.quantity),
      row.grossProceedsGbp.toFixed(2),
      row.disposalFeesGbp.toFixed(2),
      row.allowableCostGbp.toFixed(2),
      row.gainOrLossGbp.toFixed(2),
      String(row.roundedGainOrLossGbp),
      csvEscape(breakdown),
    ];
    lines.push(cells.join(','));
  }

  const body = `${lines.join('\r\n')}\r\n`;
  const filename = `disposals-${holding.symbol.replace(/[^a-zA-Z0-9_.-]+/g, '_')}-${symbol}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
