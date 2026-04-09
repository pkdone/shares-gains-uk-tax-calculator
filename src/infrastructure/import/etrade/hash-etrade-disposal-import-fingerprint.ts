import { createHash } from 'node:crypto';

import { formatEtradeDisposalImportFingerprintMaterial } from '@/infrastructure/import/etrade/etrade-stock-plan-orders-pdf';

export function hashEtradeDisposalImportFingerprint(material: string): string {
  return createHash('sha256').update(material, 'utf8').digest('hex');
}

export function computeEtradeDisposalImportFingerprint(params: {
  readonly holdingId: string;
  readonly eventDate: string;
  readonly quantity: number;
  readonly grossProceedsUsd: number;
  readonly feesUsd: number;
  readonly firstOrderExecutedRaw: string;
}): string {
  const material = formatEtradeDisposalImportFingerprintMaterial(params);
  return hashEtradeDisposalImportFingerprint(material);
}
