import { z } from 'zod';

import { stockSymbolSchema } from '@/domain/schemas/stock-symbol';
import { shareAcquisitionManualUsdSchema } from '@/domain/schemas/share-acquisition';
import { shareDisposalBaseSchema } from '@/domain/schemas/share-disposal';
import { roundMoney2dp } from '@/domain/services/section-104-pool';

/** Server action / form payload: create holding (symbol only; user from session). */
export const createHoldingFormSchema = z.object({
  symbol: stockSymbolSchema,
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
  holdingSymbol: string,
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
    symbol: holdingSymbol,
    eventDate: formData.get('eventDate'),
    quantity,
    considerationUsd,
    feesUsd,
  });
}

export function parseDisposalForm(
  formData: FormData,
  holdingSymbol: string,
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
    symbol: holdingSymbol,
    eventDate: formData.get('eventDate'),
    quantity,
    grossProceedsUsd,
    feesUsd,
  });
}

export const ledgerEntryKindSchema = z.enum(['ACQUISITION', 'DISPOSAL']);

export const deleteLedgerEntryFormSchema = z.object({
  holdingId: z.string().trim().min(1),
  kind: ledgerEntryKindSchema,
  entryId: z.string().trim().min(1),
});
