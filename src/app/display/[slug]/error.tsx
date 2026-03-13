"use client";

export default function DisplayError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center bg-[#050608] text-stone-100">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-amber-300">
          Display Error
        </p>
        <h1 className="text-4xl font-semibold text-white">
          Unable to load display
        </h1>
        <p className="text-lg text-stone-300">
          This screen will automatically retry.
        </p>
      </div>
      <button
        className="mt-8 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
        onClick={reset}
        type="button"
      >
        Retry now
      </button>
    </main>
  );
}
