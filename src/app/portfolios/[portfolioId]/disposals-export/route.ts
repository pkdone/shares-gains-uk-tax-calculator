import { type NextRequest, NextResponse } from 'next/server';

import { listPortfolioSymbols } from '@/application/calculation/list-portfolio-symbols';
import { resolveBroughtForwardFromQueryAndPrefs } from '@/application/calculation/resolve-brought-forward';
import { runCalculationForSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { rateTierSchema } from '@/domain/schemas/calculation';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoPortfolioCalculationPrefsRepository } from '@/infrastructure/repositories/mongo-portfolio-calculation-prefs-repository';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { env } from '@/shared/config/env';
import { DomainError } from '@/shared/errors/app-error';

const portfolioRepository = new MongoPortfolioRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();
const prefsRepository = new MongoPortfolioCalculationPrefsRepository();

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ portfolioId: string }> },
): Promise<Response> {
  const { portfolioId } = await context.params;
  const sp = req.nextUrl.searchParams;

  const portfolio = await portfolioRepository.findByIdForUser(portfolioId, env.STUB_USER_ID);
  if (portfolio === null) {
    return new NextResponse('Not found', { status: 404 });
  }

  const symbols = await listPortfolioSymbols({
    acquisitionRepository,
    disposalRepository,
    portfolioId,
    userId: env.STUB_USER_ID,
  });

  const prefs = await prefsRepository.findByPortfolioForUser(portfolioId, env.STUB_USER_ID);
  const hasBfQuery = sp.has('bf') && sp.get('bf')?.trim() !== '';
  const bfParsed = Number.parseFloat(sp.get('bf') ?? '0');
  const broughtForwardLosses = resolveBroughtForwardFromQueryAndPrefs({
    hasBfQuery,
    queryBfParsed: bfParsed,
    storedBroughtForwardLossesGbp: prefs?.broughtForwardLossesGbp,
  });

  const symbolFromQuery = sp.get('symbol')?.trim() ?? '';
  const symbol = symbolFromQuery.length > 0 ? symbolFromQuery : (symbols[0] ?? '');

  const tierParsed = rateTierSchema.safeParse(sp.get('rateTier') ?? 'additional');
  const rateTier = tierParsed.success ? tierParsed.data : 'additional';

  if (symbol.length === 0) {
    return new NextResponse('No symbol', { status: 400 });
  }

  let result: Awaited<ReturnType<typeof runCalculationForSymbol>>;
  try {
    result = await runCalculationForSymbol({
      portfolioRepository,
      acquisitionRepository,
      disposalRepository,
      fxRateRepository,
      input: {
        portfolioId,
        userId: env.STUB_USER_ID,
        symbol,
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
  const filename = `disposals-${portfolio.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}-${symbol}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
