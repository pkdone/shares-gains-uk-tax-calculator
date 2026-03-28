/**
 * Project-wide operational logging. Call sites use these helpers; only this module
 * invokes `console` directly (see `eslint.config.mjs` `no-console` override for this file).
 */

/** Writes an informational message (stdout via `console.log`). */
export function logInfo(message: string): void {
  console.log(message);
}

/** Writes a warning message (`console.warn`). */
export function logWarn(message: string): void {
  console.warn(message);
}

/** Writes an error message (`console.error`). */
export function logError(message: string): void {
  console.error(message);
}

/**
 * Prints a trailing newline so CLI output is separated from the next shell prompt.
 * Call once after successful script output or after `logError` in a catch handler.
 */
export function logScriptEnd(): void {
  process.stdout.write('\n');
}
