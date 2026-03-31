'use client';

import { authClient } from '@/shared/auth-client';

export function SignOutButton(): React.ReactElement {
  return (
    <button
      type="button"
      className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      onClick={() => {
        void authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = '/';
            },
          },
        });
      }}
    >
      Sign out
    </button>
  );
}
