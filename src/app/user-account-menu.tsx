'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { authClient } from '@/shared/auth-client';

function ChevronDownIcon({ open }: { readonly open: boolean }): ReactElement {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type UserAccountMenuProps = {
  readonly displayName: string;
};

/**
 * Account control in the page header: shows the user label and offers sign-out from a dropdown.
 */
export function UserAccountMenu({ displayName }: UserAccountMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDocPointerDown = (event: PointerEvent): void => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', onDocPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
    };
  }, [open]);

  const signOut = useCallback((): void => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/';
        },
      },
    });
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0 self-start">
      <button
        type="button"
        className="inline-flex max-w-[min(100vw-8rem,16rem)] items-center gap-1 truncate rounded-md px-2 py-1.5 text-right text-sm font-medium text-[var(--color-accent)] underline decoration-transparent underline-offset-2 transition-colors hover:bg-neutral-100 hover:decoration-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <span className="truncate">{displayName}</span>
        <ChevronDownIcon open={open} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-md border border-neutral-200 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
