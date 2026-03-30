'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const MAX_SCROLL_ATTEMPTS = 40;
const SCROLL_RETRY_MS = 50;

/**
 * After GET submit (or direct link with ?symbol=…), scroll results into view so the
 * user sees output below the form instead of an apparently empty area under "FX applied".
 * Retries briefly so we still run after RSC/streaming finishes inserting `#calculation-results`.
 */
export function ScrollToCalculationResults(): null {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('symbol')) {
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const tryScroll = (): void => {
      if (cancelled) {
        return;
      }

      const el = document.getElementById('calculation-results');
      if (el !== null) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      attempt += 1;
      if (attempt < MAX_SCROLL_ATTEMPTS) {
        window.setTimeout(tryScroll, SCROLL_RETRY_MS);
      }
    };

    window.requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return null;
}
