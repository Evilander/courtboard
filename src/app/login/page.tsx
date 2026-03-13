import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: {
    callbackUrl?: string;
  };
}) {
  const raw = searchParams?.callbackUrl || "/dashboard";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-stone-950/40">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            Secure Admin Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            Sign in to manage courthouse screens.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
            CourtBoard protects administrative workflows with role-based access,
            TOTP multi-factor authentication, account lockout rules, and audit
            trails for every sign-in attempt.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "JWT-backed sessions with enforced idle timeout",
              "Rate limiting and CSRF checks on privileged routes",
              "SQLite audit trail for successful and failed sign-ins",
              "Seeded admin account for initial system bring-up",
            ].map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-stone-200"
              >
                {feature}
              </div>
            ))}
          </div>
        </section>

        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
