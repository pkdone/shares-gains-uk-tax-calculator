import { logInfo } from '@/shared/app-logger';
import { env } from '@/shared/config/env';

export type AuthEmailPayload = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
};

/**
 * Sends transactional auth email. Replace {@link sendViaSmtp} when a real provider is configured.
 */
export async function sendAuthEmail(payload: AuthEmailPayload): Promise<void> {
  if (env.AUTH_EMAIL_PROVIDER === 'smtp') {
    await sendViaSmtp(payload);
    return;
  }

  // Noop: no SMTP. Log a dedicated URL line so it is visible right after POST /api/auth/... in the dev terminal.
  logInfo(`Auth email (noop): subject=${payload.subject} recipient=${payload.to}`);
  const urlMatch = payload.text.match(/https?:\/\/[^\s<>"']+/);
  if (urlMatch !== null) {
    logInfo(`[dev] Copy this URL into the browser (noop email — not sent): ${urlMatch[0]}`);
  }
  logInfo(`Auth email (noop) full text: ${payload.text}`);
}

/** Reserved for SMTP / Resend / SES — implement when {@link env.AUTH_EMAIL_PROVIDER} is `smtp`. */
async function sendViaSmtp(_payload: AuthEmailPayload): Promise<void> {
  await Promise.reject(
    new Error(
      'AUTH_EMAIL_PROVIDER=smtp is set but SMTP delivery is not implemented. Use noop or add an adapter.',
    ),
  );
}
