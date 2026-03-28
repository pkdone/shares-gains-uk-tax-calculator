/**
 * Base application error. Extend for validation, domain, persistence, configuration, and import failures.
 */
export class AppError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type ErrorOptions = { readonly cause?: unknown };

/**
 * Invalid environment or application configuration.
 */
export class ConfigurationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'CONFIG_INVALID');
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Input or transport-level validation failed.
 */
export class ValidationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'VALIDATION_FAILED');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Domain invariant or business rule violated.
 */
export class DomainError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'DOMAIN_RULE');
    this.name = 'DomainError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Unexpected persistence or database failure.
 */
export class PersistenceError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'PERSISTENCE_FAILED');
    this.name = 'PersistenceError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Import or file parsing failure (reserved for import pipelines).
 */
export class ImportError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'IMPORT_FAILED');
    this.name = 'ImportError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
