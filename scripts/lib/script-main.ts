import { logError, logScriptEnd } from '../../src/shared/app-logger';

export function reportScriptFailure(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  logError(message);
  logScriptEnd();
  process.exitCode = 1;
}
