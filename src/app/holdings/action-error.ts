import { inspect } from 'node:util';

import type { z } from 'zod';

import type { FormActionState } from '@/app/holdings/types';
import { DomainError } from '@/domain/errors/domain-error';
import { logError } from '@/shared/app-logger';
import { AppError } from '@/shared/errors/app-error';

/**
 * First user-facing message from a Zod error (form-level, then first field).
 */
export function formatZodErrorMessage(error: z.ZodError, fallback: string): string {
  const flat = error.flatten();
  return flat.formErrors[0] ?? Object.values(flat.fieldErrors)[0]?.[0] ?? fallback;
}

/**
 * Maps a Zod error to {@link FormActionState} fields returned by server actions that surface field errors.
 */
export function zodErrorToFormActionFields(
  error: z.ZodError,
  fallback: string,
): Pick<FormActionState, 'error' | 'fieldErrors'> {
  const flat = error.flatten();
  const message = formatZodErrorMessage(error, fallback);
  return {
    error: message,
    fieldErrors: flat.fieldErrors as FormActionState['fieldErrors'],
  };
}

function logUnexpectedFormActionError(err: unknown, context: string): void {
  if (err instanceof Error) {
    logError(`[form-action] ${context}: ${err.name}: ${err.message}`);
    if (err.cause !== undefined) {
      if (err.cause instanceof Error) {
        logError(`[form-action] ${context} (cause): ${err.cause.name}: ${err.cause.message}`);
      } else {
        logError(`[form-action] ${context} (cause): ${inspect(err.cause, { depth: 4 })}`);
      }
    }
    return;
  }
  logError(`[form-action] ${context}: ${inspect(err, { depth: 4 })}`);
}

/**
 * Maps errors from server actions to a safe message for the client.
 * {@link DomainError} and other {@link AppError} types use their message (user-facing, no stack traces).
 * Unexpected errors log server-side and return `fallbackMessage` only.
 *
 * @param fallbackMessage - Safe message when the error is not a domain or application error.
 */
export function toFormActionError(err: unknown, fallbackMessage: string): FormActionState {
  if (err instanceof DomainError) {
    return { error: err.message };
  }

  if (err instanceof AppError) {
    return { error: err.message };
  }

  if (err instanceof Error) {
    logUnexpectedFormActionError(err, fallbackMessage);
    return { error: fallbackMessage };
  }

  logUnexpectedFormActionError(err, fallbackMessage);
  return { error: fallbackMessage };
}
