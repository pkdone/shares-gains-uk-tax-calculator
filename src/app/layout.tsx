import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Shares Gains UK Tax Calculator',
  description: 'UK capital gains on equity compensation — planning tool, not tax advice.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col antialiased" suppressHydrationWarning>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-neutral-200 bg-neutral-50 px-6 py-4 text-xs text-orange-700 no-print">
          Provides holding-level capital gains and losses only. Does not show your overall CGT liability for a tax year.
          Not professional tax advice. The calculations shown may be incorrect.
        </footer>
      </body>
    </html>
  );
}
