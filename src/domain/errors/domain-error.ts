import { AppError } from '@/shared/errors/app-error';

/**
 * Domain invariant or business rule violated.
 */
export class DomainError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'DOMAIN_RULE', options);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
