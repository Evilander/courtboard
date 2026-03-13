"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { mapSignInCodeToMessage } from "@/lib/auth/messages";

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const totp = String(formData.get("totp") ?? "");

    startTransition(() => {
      void (async () => {
        const result = await signIn("credentials", {
          redirect: false,
          redirectTo: callbackUrl,
          username,
          password,
          totp,
        });

        if (!result) {
          setError("Unable to reach the authentication service.");
          return;
        }

        if (result.error) {
          setError(mapSignInCodeToMessage(result.code));
          return;
        }

        router.push(result.url ?? callbackUrl);
        router.refresh();
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-stone-950/90 p-8 shadow-2xl shadow-black/40">
      <h2 className="text-2xl font-semibold text-white">Admin sign-in</h2>
      <p className="mt-3 text-sm leading-6 text-stone-300">
        Use your CourtBoard credentials. If multi-factor auth is enabled on your
        account, the six-digit authenticator code is required.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-200">
            Username
          </span>
          <input
            autoComplete="username"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300"
            name="username"
            placeholder="admin"
            required
            type="text"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-200">
            Password
          </span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-stone-200">
            Authenticator code
          </span>
          <input
            autoComplete="one-time-code"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300"
            inputMode="numeric"
            maxLength={6}
            name="totp"
            placeholder="123456"
            type="text"
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-amber-300/70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </section>
  );
}
