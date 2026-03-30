import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';

export async function listPortfolioSymbols(params: {
  readonly acquisitionRepository: ShareAcquisitionRepository;
  readonly disposalRepository: ShareDisposalRepository;
  readonly portfolioId: string;
  readonly userId: string;
}): Promise<string[]> {
  const [acquisitions, disposals] = await Promise.all([
    params.acquisitionRepository.listByPortfolioForUser(params.portfolioId, params.userId),
    params.disposalRepository.listByPortfolioForUser(params.portfolioId, params.userId),
  ]);

  const symbols = new Set<string>();
  for (const a of acquisitions) {
    symbols.add(a.symbol);
  }

  for (const d of disposals) {
    symbols.add(d.symbol);
  }

  return [...symbols].sort((x, y) => x.localeCompare(y));
}
