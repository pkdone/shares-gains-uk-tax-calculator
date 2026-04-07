/**
 * Base application error. Extend for validation, domain, persistence, configuration, and import failures.
 */
export class AppError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Invalid environment or application configuration.
 */
export class ConfigurationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'CONFIG_INVALID', options);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Input or transport-level validation failed.
 */
export class ValidationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'VALIDATION_FAILED', options);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Unexpected persistence or database failure.
 */
export class PersistenceError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'PERSISTENCE_FAILED', options);
    this.name = 'PersistenceError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Import or file parsing failure (reserved for import pipelines).
 */
export class ImportError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'IMPORT_FAILED', options);
    this.name = 'ImportError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
