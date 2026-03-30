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
        <footer className="border-t border-neutral-200 bg-neutral-50 px-6 py-4 text-xs text-neutral-600 no-print">
          Not professional tax advice. Results use your selected CGT rate tier; the app does not determine your
          income tax band.
        </footer>
      </body>
    </html>
  );
}
