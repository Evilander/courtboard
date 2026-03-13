import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
    reason?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawCallbackUrl = resolvedSearchParams?.callbackUrl;
  const rawReason = resolvedSearchParams?.reason;
  const raw = Array.isArray(rawCallbackUrl)
    ? rawCallbackUrl[0] ?? "/dashboard"
    : rawCallbackUrl ?? "/dashboard";
  const reason = Array.isArray(rawReason) ? rawReason[0] ?? null : rawReason ?? null;
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  const idleTimeoutNotice =
    reason === "idle"
      ? "Your session ended after inactivity. Sign in again to continue."
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        {idleTimeoutNotice ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            {idleTimeoutNotice}
          </div>
        ) : null}

        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            CourtBoard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Admin Sign-In
          </h1>
        </div>

        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
