import { z } from 'zod';

import { portfolioNameSchema } from '@/domain/schemas/portfolio';
import { shareAcquisitionBaseSchema } from '@/domain/schemas/share-acquisition';
import { shareDisposalBaseSchema } from '@/domain/schemas/share-disposal';

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
): z.SafeParseReturnType<z.infer<typeof shareAcquisitionBaseSchema>, z.infer<typeof shareAcquisitionBaseSchema>> {
  return shareAcquisitionBaseSchema.safeParse({
    symbol: formData.get('symbol'),
    eventDate: formData.get('eventDate'),
    quantity: coerceNumber(formData, 'quantity'),
    grossConsiderationGbp: coerceNumber(formData, 'grossConsiderationGbp'),
    feesGbp: coerceNumber(formData, 'feesGbp'),
  });
}

export function parseDisposalForm(
  formData: FormData,
): z.SafeParseReturnType<z.infer<typeof shareDisposalBaseSchema>, z.infer<typeof shareDisposalBaseSchema>> {
  return shareDisposalBaseSchema.safeParse({
    symbol: formData.get('symbol'),
    eventDate: formData.get('eventDate'),
    quantity: coerceNumber(formData, 'quantity'),
    grossProceedsGbp: coerceNumber(formData, 'grossProceedsGbp'),
    feesGbp: coerceNumber(formData, 'feesGbp'),
  });
}
