import { z } from 'zod';

import { portfolioNameSchema } from '@/domain/schemas/portfolio';
import { shareAcquisitionManualUsdSchema } from '@/domain/schemas/share-acquisition';
import { shareDisposalBaseSchema } from '@/domain/schemas/share-disposal';
import { roundMoney2dp } from '@/domain/services/section-104-pool';

/** Server action / form payload: create portfolio (name only; user from config). */
export const createPortfolioFormSchema = z.object({
  name: portfolioNameSchema,
});

export function formDataString(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (typeof v !== 'string') {
    return '';
  }
  return v.trim();
}

function coerceNumber(formData: FormData, key: string): unknown {
  const v = formData.get(key);
  if (v === null || v === '') {
    return undefined;
  }
  if (typeof v !== 'string') {
    return undefined;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function parseAcquisitionForm(
  formData: FormData,
): z.SafeParseReturnType<
  z.infer<typeof shareAcquisitionManualUsdSchema>,
  z.infer<typeof shareAcquisitionManualUsdSchema>
> {
  const quantity = coerceNumber(formData, 'quantity');
  const pricePerShareUsd = coerceNumber(formData, 'pricePerShareUsd');
  const feesUsd = coerceNumber(formData, 'feesUsd');
  let considerationUsd: number | undefined;
  if (
    typeof quantity === 'number' &&
    typeof pricePerShareUsd === 'number' &&
    Number.isFinite(quantity) &&
    Number.isFinite(pricePerShareUsd)
  ) {
    considerationUsd = roundMoney2dp(quantity * pricePerShareUsd);
  }
  return shareAcquisitionManualUsdSchema.safeParse({
    economicsKind: 'manual_usd',
    symbol: formData.get('symbol'),
    eventDate: formData.get('eventDate'),
    quantity,
    considerationUsd,
    feesUsd,
  });
}

export function parseDisposalForm(
  formData: FormData,
): z.SafeParseReturnType<z.infer<typeof shareDisposalBaseSchema>, z.infer<typeof shareDisposalBaseSchema>> {
  const quantity = coerceNumber(formData, 'quantity');
  const pricePerShareUsd = coerceNumber(formData, 'pricePerShareUsd');
  const feesUsd = coerceNumber(formData, 'feesUsd');
  let grossProceedsUsd: number | undefined;
  if (
    typeof quantity === 'number' &&
    typeof pricePerShareUsd === 'number' &&
    Number.isFinite(quantity) &&
    Number.isFinite(pricePerShareUsd)
  ) {
    grossProceedsUsd = roundMoney2dp(quantity * pricePerShareUsd);
  }
  return shareDisposalBaseSchema.safeParse({
    symbol: formData.get('symbol'),
    eventDate: formData.get('eventDate'),
    quantity,
    grossProceedsUsd,
    feesUsd,
  });
}

export const ledgerEntryKindSchema = z.enum(['ACQUISITION', 'DISPOSAL']);

export const deleteLedgerEntryFormSchema = z.object({
  portfolioId: z.string().trim().min(1),
  kind: ledgerEntryKindSchema,
  entryId: z.string().trim().min(1),
});
