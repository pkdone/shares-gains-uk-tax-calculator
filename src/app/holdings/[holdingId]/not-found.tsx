import Link from 'next/link';

export default function HoldingNotFound(): React.ReactElement {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-xl font-semibold">Holding not found</h1>
      <Link href="/holdings" className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline">
        Back to holdings
      </Link>
    </main>
  );
}
