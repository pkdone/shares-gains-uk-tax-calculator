import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';
import { parseEtradeByBenefitTypeGrid } from '@/infrastructure/import/etrade/by-benefit-type';

export type EtradePreviewOutcome = {
  readonly drafts: readonly ShareAcquisitionImportUsd[];
  readonly notices: readonly string[];
  readonly errors: readonly string[];
};

/**
 * Runs the By Benefit Type grid through the broker parser (anti-corruption layer).
 */
export function previewEtradeByBenefitTypeImport(grid: readonly (readonly string[])[]): EtradePreviewOutcome {
  const { drafts, issues } = parseEtradeByBenefitTypeGrid(grid);
  const errors = issues.filter((i) => i.kind === 'error').map((i) => i.message);
  const notices = issues.filter((i) => i.kind === 'notice').map((i) => i.message);
  return { drafts, notices, errors };
}
