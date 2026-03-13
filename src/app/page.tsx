export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-stone-950/40 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            CourtBoard
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Courthouse digital signage infrastructure, built for local control.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
            The foundation layer is online with SQLite, Drizzle migrations,
            credentials plus TOTP MFA, hardened middleware, Docker deployment,
            and seeded demo data for courthouse screens.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
              href="/dashboard"
            >
              Open Dashboard
            </a>
            <a
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              href="/login"
            >
              Admin Sign-In
            </a>
            <a
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              href="/api/status"
            >
              API Status
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Secure by Default",
              body: "Credentials auth, TOTP MFA, account lockout, audit logging, CSRF checks, rate limiting, and a locked-down response header set.",
            },
            {
              title: "Operations Ready",
              body: "SQLite on WAL mode, deterministic migrations, a repeatable seed path, standalone Next.js output, and containerized startup migrations.",
            },
            {
              title: "Built for Screens",
              body: "Schema coverage is in place for screens, schedules, content rotations, emergency announcements, and heartbeat-aware device metadata.",
            },
          ].map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
            >
              <h2 className="text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                {card.body}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
