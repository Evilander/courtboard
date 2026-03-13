"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { Building2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DisplayPayload } from "@/lib/display";
import { formatDisplayTime, formatLongDisplayDate, HEARTBEAT_INTERVAL_MS } from "@/lib/time";

function statusVariant(status: string) {
  switch (status) {
    case "in_progress":
      return "success";
    case "scheduled":
      return "warning";
    case "completed":
      return "muted";
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}

function useDisplayClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function NoSessionsState({ courthouseName }: { courthouseName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-12 text-center">
      <img
        alt="Courthouse silhouette"
        className="h-32 w-32 opacity-70"
        src="/courthouse-silhouette.svg"
      />
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.4em] text-amber-300">
          {courthouseName}
        </p>
        <h2 className="text-4xl font-semibold text-white">
          No court sessions scheduled today
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-stone-300">
          Check back later for updated courtroom activity, announcements, and
          public information from the clerk&apos;s office.
        </p>
      </div>
    </div>
  );
}

function LobbyDisplay({ payload }: { payload: DisplayPayload }) {
  return (
    <div className="grid h-full grid-cols-[1.5fr_0.9fr] gap-6">
      <section className="flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-black/20 p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
              Daily Docket
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              All Courtrooms
            </h2>
          </div>
          <p className="text-sm text-stone-400">
            {payload.schedules.length} scheduled matters
          </p>
        </div>

        {payload.schedules.length === 0 ? (
          <NoSessionsState courthouseName={payload.courthouseName} />
        ) : (
          <div className="grid flex-1 grid-rows-[auto,1fr] overflow-hidden rounded-[1.5rem] border border-white/10">
            <div className="grid grid-cols-[0.8fr_1fr_1.3fr_1fr_0.8fr] bg-white/5 px-6 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-stone-400">
              <span>Time</span>
              <span>Courtroom</span>
              <span>Case</span>
              <span>Judge</span>
              <span>Status</span>
            </div>
            <div className="grid auto-rows-fr overflow-hidden">
              {payload.schedules.slice(0, 12).map((entry) => (
                <div
                  className="grid grid-cols-[0.8fr_1fr_1.3fr_1fr_0.8fr] items-center border-t border-white/10 px-6 py-4"
                  key={entry.id}
                >
                  <div className="text-2xl font-semibold text-white">
                    {formatDisplayTime(entry.scheduledTime)}
                  </div>
                  <div className="text-lg text-stone-200">{entry.courtroom}</div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {entry.caseNumber}
                    </p>
                    <p className="truncate text-sm text-stone-400">
                      {entry.caseTitle}
                    </p>
                  </div>
                  <div className="text-base text-stone-300">{entry.judgeName}</div>
                  <div>
                    <Badge variant={statusVariant(entry.status)}>
                      {entry.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex min-h-0 flex-col gap-4">
        {payload.contentItems.length === 0 ? (
          <NoSessionsState courthouseName={payload.courthouseName} />
        ) : (
          payload.contentItems.slice(0, 4).map((item) => (
            <article
              className="flex-1 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6"
              key={item.id}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
                {item.type}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                {item.title}
              </h3>
              {item.imagePath ? (
                <img
                  alt={item.title}
                  className="mt-4 h-[180px] w-full rounded-2xl object-cover"
                  src={item.imagePath}
                />
              ) : (
                <p className="mt-4 text-base leading-7 text-stone-300">
                  {item.body}
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function CourtroomDisplay({ payload }: { payload: DisplayPayload }) {
  const judgeLabel = payload.judgeNames.length
    ? payload.judgeNames.join(" / ")
    : "Court schedule pending";

  return (
    <div className="grid h-full grid-rows-[auto,1fr] gap-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
              Courtroom Schedule
            </p>
            <h2 className="mt-3 text-5xl font-semibold text-white">
              {payload.screen.name}
            </h2>
            <p className="mt-3 text-2xl text-stone-300">{judgeLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">
              Location
            </p>
            <p className="mt-2 text-lg text-white">
              {payload.screen.locationDescription || payload.screen.slug}
            </p>
          </div>
        </div>
      </section>

      {payload.schedules.length === 0 ? (
        <NoSessionsState courthouseName={payload.courthouseName} />
      ) : (
        <section className="grid auto-rows-fr gap-4 overflow-hidden">
          {payload.schedules.slice(0, 8).map((entry) => (
            <article
              className="grid grid-cols-[0.65fr,1.6fr,0.8fr] items-center gap-6 rounded-[1.75rem] border border-white/10 bg-black/20 px-8 py-6"
              key={entry.id}
            >
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-stone-400">
                  Time
                </p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  {formatDisplayTime(entry.scheduledTime)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(entry.status)}>
                    {entry.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm uppercase tracking-[0.2em] text-stone-400">
                    {entry.caseType}
                  </span>
                </div>
                <h3 className="mt-4 text-3xl font-semibold text-white">
                  {entry.caseNumber}
                </h3>
                <p className="mt-3 text-xl text-stone-300">{entry.caseTitle}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                  Duration
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {entry.estimatedDuration ? `${entry.estimatedDuration} min` : "TBD"}
                </p>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function InfoDisplay({
  payload,
  activeIndex,
}: {
  payload: DisplayPayload;
  activeIndex: number;
}) {
  const activeItem = payload.contentItems[activeIndex] ?? null;

  if (!activeItem) {
    return <NoSessionsState courthouseName={payload.courthouseName} />;
  }

  return (
    <section className="flex h-full items-center justify-center rounded-[2rem] border border-white/10 bg-black/20 p-8">
      {activeItem.type === "image" && activeItem.imagePath ? (
        <div className="grid h-full w-full grid-rows-[1fr,auto] gap-6">
          <img
            alt={activeItem.title}
            className="h-full w-full rounded-[1.5rem] object-contain"
            src={activeItem.imagePath}
          />
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-white">{activeItem.title}</h2>
            {activeItem.body ? (
              <p className="mt-4 text-xl text-stone-300">{activeItem.body}</p>
            ) : null}
          </div>
        </div>
      ) : activeItem.type === "html" ? (
        <div className="prose prose-invert max-w-none text-center prose-headings:text-white prose-p:text-stone-200">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeItem.body ?? "") }} />
        </div>
      ) : (
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
            County Information
          </p>
          <h2 className="mt-5 text-5xl font-semibold text-white">
            {activeItem.title}
          </h2>
          <p className="mt-6 text-2xl leading-10 text-stone-200">
            {activeItem.body}
          </p>
        </div>
      )}
    </section>
  );
}

export function DisplayClient({ payload }: { payload: DisplayPayload }) {
  const router = useRouter();
  const now = useDisplayClock();
  const [heartbeatOk, setHeartbeatOk] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [payload.contentItems.length, payload.screen.rotationIntervalSeconds]);

  useEffect(() => {
    if (payload.screen.zone !== "info" || payload.contentItems.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % payload.contentItems.length);
    }, payload.screen.rotationIntervalSeconds * 1000);

    return () => window.clearInterval(interval);
  }, [
    payload.contentItems.length,
    payload.screen.rotationIntervalSeconds,
    payload.screen.zone,
  ]);

  useEffect(() => {
    const stream = new EventSource(
      `/api/sse/display?screen=${encodeURIComponent(payload.screen.slug)}`,
    );

    stream.addEventListener("open", () => setSseConnected(true));
    stream.addEventListener("error", () => setSseConnected(false));
    stream.addEventListener("update", () => {
      router.refresh();
    });

    return () => {
      stream.close();
      setSseConnected(false);
    };
  }, [payload.screen.slug, router]);

  useEffect(() => {
    let active = true;

    async function sendHeartbeat() {
      try {
        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: payload.screen.slug }),
        });
        if (active) {
          setHeartbeatOk(true);
        }
      } catch {
        if (active) {
          setHeartbeatOk(false);
        }
      }
    }

    void sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [payload.screen.slug]);

  const heartbeatVariant = useMemo(() => {
    if (!heartbeatOk) {
      return "danger";
    }

    if (!sseConnected) {
      return "warning";
    }

    return "success";
  }, [heartbeatOk, sseConnected]);

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#050608] text-stone-100">
      <header className="flex items-start justify-between border-b border-white/10 px-8 py-6">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-amber-300">
            {payload.courthouseName}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            {payload.screen.name}
          </h1>
          <div className="flex items-center gap-3 text-lg text-stone-300">
            <Building2 className="h-5 w-5 text-amber-300" />
            <span>{formatLongDisplayDate(now)}</span>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-5 text-right">
          <div className="flex items-center justify-end gap-3 text-stone-400">
            <Clock3 className="h-5 w-5 text-amber-300" />
            <span className="text-xs uppercase tracking-[0.25em]">Current Time</span>
          </div>
          <p className="mt-3 text-5xl font-semibold text-white">
            {new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            }).format(now)}
          </p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-hidden px-8 py-6">
        {payload.screen.zone === "lobby" ? (
          <LobbyDisplay payload={payload} />
        ) : payload.screen.zone === "courtroom" ? (
          <CourtroomDisplay payload={payload} />
        ) : (
          <InfoDisplay activeIndex={activeIndex} payload={payload} />
        )}
      </section>

      <div className="absolute bottom-5 right-5">
        <Badge className="gap-2 px-3 py-2" variant={heartbeatVariant}>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current" />
          {heartbeatOk && sseConnected ? "Connected" : heartbeatOk ? "Syncing" : "Offline"}
        </Badge>
      </div>

      {payload.emergency ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/95 px-16 text-center animate-pulse">
          <div className="space-y-6">
            <p className="text-lg font-semibold uppercase tracking-[0.45em] text-red-100">
              Emergency Alert
            </p>
            <h2 className="text-6xl font-semibold leading-tight text-white">
              {payload.emergency.title}
            </h2>
            {payload.emergency.body ? (
              <p className="mx-auto max-w-4xl text-3xl leading-relaxed text-red-100">
                {payload.emergency.body}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
