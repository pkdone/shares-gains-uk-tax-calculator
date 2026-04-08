import { logInfo, logWarn } from '@/shared/app-logger';
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

  // Noop: no SMTP. Use warn so the URL stands out in `next dev` output (same stream as POST lines).
  logInfo(`Auth email (noop): subject=${payload.subject} recipient=${payload.to}`);
  const urlRe = /https?:\/\/[^\s<>"']+/;
  const urlMatch = urlRe.exec(payload.text);
  if (urlMatch) {
    if (env.NODE_ENV === 'production') {
      logWarn(
        'Auth email (noop): verification/reset URL omitted from logs in production. Configure SMTP (AUTH_EMAIL_PROVIDER=smtp) for real delivery.',
      );
    } else {
      logWarn(`[dev] NOOP EMAIL — copy this URL into the browser: ${urlMatch[0]}`);
    }
  } else {
    logInfo(`Auth email (noop) full text: ${payload.text}`);
  }
}

/** Reserved for SMTP / Resend / SES — implement when {@link env.AUTH_EMAIL_PROVIDER} is `smtp`. */
async function sendViaSmtp(_payload: AuthEmailPayload): Promise<void> {
  await Promise.reject(
    new Error(
      'AUTH_EMAIL_PROVIDER=smtp is set but SMTP delivery is not implemented. Use noop or add an adapter.',
    ),
  );
}
