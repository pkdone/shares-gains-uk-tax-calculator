import type { FormActionState } from '@/app/holdings/types';
import { DomainError } from '@/domain/errors/domain-error';

export function toFormActionError(err: unknown, fallbackMessage: string): FormActionState {
  if (err instanceof DomainError) {
    return { error: err.message };
  }
  if (err instanceof Error) {
    return { error: err.message };
  }
  return { error: fallbackMessage };
}
