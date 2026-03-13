"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
          Something went wrong
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Unable to load this page
        </h1>
        <p className="max-w-xl text-sm leading-7 text-stone-300">
          {error.message || "An unexpected error occurred."}
          {error.digest ? (
            <span className="mt-1 block text-xs text-stone-500">
              Reference: {error.digest}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <a
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
          href="/dashboard"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
