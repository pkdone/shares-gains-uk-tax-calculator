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
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
