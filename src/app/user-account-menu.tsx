'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { authClient } from '@/shared/auth-client';

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
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className="max-w-[min(100vw-8rem,16rem)] truncate rounded-md px-2 py-1.5 text-right text-sm font-medium text-neutral-800 hover:bg-neutral-100"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        {displayName}
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
