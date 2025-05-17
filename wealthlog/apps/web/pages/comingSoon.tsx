// components/ComingSoon.tsx
import Head from 'next/head';
import Link from 'next/link';

export default function ComingSoon() {
  return (
    <>
      <Head><title>Coming Soon | WealthLog</title></Head>

      <main className="flex flex-col items-center justify-center h-screen gap-6
                       bg-background text-text p-8">
        <h1 className="text-3xl md:text-5xl font-bold text-center">
          🚧 Module under construction
        </h1>

        <p className="text-lg md:text-xl text-center max-w-md opacity-80">
          This part of WealthLog isn’t ready yet. We’re working hard to bring it
          to you soon – stay tuned!
        </p>

        <Link
          href="/landing"
          className="rounded-xl border px-6 py-2 text-base font-medium
                     border-primary hover:bg-primary/10 transition"
        >
          ← Back to dashboard
        </Link>
      </main>
    </>
  );
}
