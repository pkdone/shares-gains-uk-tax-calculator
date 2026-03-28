import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';

export type LedgerLine =
  | { readonly kind: 'ACQUISITION'; readonly data: ShareAcquisition }
  | { readonly kind: 'DISPOSAL'; readonly data: ShareDisposal };

export type LedgerTaxYearGroup = {
  readonly taxYearLabel: string;
  readonly lines: readonly LedgerLine[];
};

export type LedgerForPortfolio = {
  readonly portfolioId: string;
  readonly orderedLines: readonly LedgerLine[];
  readonly byTaxYear: readonly LedgerTaxYearGroup[];
};
