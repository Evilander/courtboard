import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-stone-100">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mt-4 text-base text-stone-300">
          The page you requested does not exist on this CourtBoard instance.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
            href="/dashboard"
          >
            Go to Dashboard
          </Link>
          <Link
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
            href="/"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
