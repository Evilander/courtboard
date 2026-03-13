"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, MonitorSmartphone, Newspaper, Siren } from "lucide-react";
import type {
  SerializedAudit,
  SerializedSchedule,
  SerializedScreen,
} from "@/lib/serializers";
import { apiFetch } from "@/lib/client/api";
import {
  AdminPageHeader,
  EmptyCard,
  ErrorNotice,
  LoadingCard,
  MetricCard,
  StatusBadge,
} from "@/components/admin/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAdminDateTime, formatRelativeLastSeen, toDateKey } from "@/lib/time";

type DashboardPageClientProps = {
  canEdit: boolean;
  isAdmin: boolean;
};

export function DashboardPageClient({
  canEdit,
  isAdmin,
}: DashboardPageClientProps) {
  const [screens, setScreens] = useState<SerializedScreen[]>([]);
  const [schedules, setSchedules] = useState<SerializedSchedule[]>([]);
  const [audit, setAudit] = useState<SerializedAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);

        const [screenResponse, scheduleResponse, auditResponse] = await Promise.all([
          apiFetch<{ screens: SerializedScreen[] }>("/api/screens"),
          apiFetch<{ entries: SerializedSchedule[] }>(
            `/api/schedules?date=${encodeURIComponent(toDateKey())}`,
          ),
          isAdmin
            ? apiFetch<{ items: SerializedAudit[] }>("/api/audit?page=1&pageSize=10")
            : Promise.resolve({ items: [] }),
        ]);

        if (cancelled) {
          return;
        }

        setScreens(screenResponse.screens);
        setSchedules(scheduleResponse.entries);
        setAudit(auditResponse.items);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(load, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAdmin]);

  const uniqueCourtrooms = new Set(schedules.map((entry) => entry.courtroom)).size;
  const onlineCount = screens.filter((screen) => screen.online).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actions={
          canEdit ? (
            <>
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-amber-200"
                href="/schedules"
              >
                <CalendarDays className="h-4 w-4" />
                Add Schedule Entry
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                href="/content"
              >
                <Newspaper className="h-4 w-4" />
                New Announcement
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/15"
                href="/alerts"
              >
                <Siren className="h-4 w-4" />
                Emergency Alert
              </Link>
            </>
          ) : null
        }
        description="Live status across every courthouse screen, today’s docket volume, and the most recent operational activity."
        eyebrow="Dashboard"
        title="Operations command center"
      />

      <ErrorNotice message={error} />

      {loading ? (
        <LoadingCard title="Loading dashboard..." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              detail={`${onlineCount} online now`}
              label="Registered screens"
              value={screens.length}
            />
            <MetricCard
              detail={`${uniqueCourtrooms} active courtrooms`}
              label="Today’s cases"
              value={schedules.length}
            />
            <MetricCard
              detail={`${Math.max(0, screens.length - onlineCount)} displays need attention`}
              label="Health summary"
              value={`${onlineCount}/${screens.length || 0}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Screen fleet</CardTitle>
                <CardDescription>
                  Online if a heartbeat was received within the last two minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {screens.length === 0 ? (
                  <EmptyCard
                    description="Add a display target on the Screens page to begin serving signage."
                    title="No screens registered"
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {screens.map((screen) => (
                      <article
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        key={screen.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                              {screen.zone}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-white">
                              {screen.name}
                            </h3>
                            <p className="mt-2 text-sm text-stone-300">
                              {screen.locationDescription || screen.slug}
                            </p>
                          </div>
                          <StatusBadge health={screen.health} online={screen.online} />
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
                          <span>Last heartbeat</span>
                          <span>{formatAdminDateTime(screen.lastSeenAt)}</span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                          {formatRelativeLastSeen(screen.lastSeenAt)}
                        </p>
                        <div className="mt-4">
                          <Link
                            className="inline-flex items-center gap-2 text-sm font-medium text-amber-300 hover:text-amber-200"
                            href={`/display/${screen.slug}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open live display
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent audit activity</CardTitle>
                <CardDescription>
                  Last 10 system actions captured for traceability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAdmin ? (
                  <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
                    Audit log visibility is restricted to administrators.
                  </p>
                ) : audit.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
                    No audit activity recorded yet.
                  </p>
                ) : (
                  audit.map((entry) => (
                    <article
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      key={entry.id}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{entry.action}</p>
                          <p className="text-sm text-stone-400">
                            {entry.username || "System"} · {entry.entityType}
                          </p>
                        </div>
                        <span className="text-sm text-stone-400">
                          {formatAdminDateTime(entry.createdAt)}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today’s schedule snapshot</CardTitle>
              <CardDescription>
                The live docket currently includes {schedules.length} matters across{" "}
                {uniqueCourtrooms} courtrooms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <EmptyCard
                  description="No court sessions are scheduled for today."
                  title="No active docket"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {schedules.slice(0, 6).map((entry) => (
                    <article
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      key={entry.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                            {entry.courtroom}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-white">
                            {entry.caseNumber}
                          </h3>
                          <p className="mt-2 text-sm text-stone-300">
                            {entry.caseTitle}
                          </p>
                        </div>
                        <MonitorSmartphone className="h-5 w-5 text-amber-300" />
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
                        <span>{entry.judgeName}</span>
                        <span>{entry.scheduledTime}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
