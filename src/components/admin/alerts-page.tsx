"use client";

import { useEffect, useState } from "react";
import { AlarmSmoke, ShieldAlert, Trash2 } from "lucide-react";
import type { ContentZoneFilter } from "@/lib/db/schema";
import type { SerializedContent } from "@/lib/serializers";
import { apiFetch } from "@/lib/client/api";
import {
  AdminPageHeader,
  ErrorNotice,
  FormField,
  LoadingCard,
  SuccessNotice,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatAdminDateTime } from "@/lib/time";

type AlertsPageClientProps = {
  canEdit: boolean;
};

export function AlertsPageClient({ canEdit }: AlertsPageClientProps) {
  const [alerts, setAlerts] = useState<SerializedContent[]>([]);
  const [message, setMessage] = useState("");
  const [zone, setZone] = useState<ContentZoneFilter>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<{ items: SerializedContent[] }>("/api/content");
        if (!cancelled) {
          setAlerts(response.items.filter((item) => item.isEmergency));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load alerts.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    const response = await apiFetch<{ items: SerializedContent[] }>("/api/content");
    setAlerts(response.items.filter((item) => item.isEmergency));
  }

  async function handleActivate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, zone }),
      });
      setMessage("");
      setSuccess("Emergency alert activated.");
      await reload();
    } catch (activateError) {
      setError(
        activateError instanceof Error
          ? activateError.message
          : "Unable to activate alert.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear(targetZone = "all") {
    if (!canEdit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/api/alerts?zone=${encodeURIComponent(targetZone)}`, {
        method: "DELETE",
      });
      setSuccess("Emergency alert cleared.");
      await reload();
    } catch (clearError) {
      setError(
        clearError instanceof Error ? clearError.message : "Unable to clear alert.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Publish an immediate full-screen emergency takeover to all displays or a targeted zone."
        eyebrow="Emergency"
        title="Emergency alert control"
      />

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="border-rose-500/30 bg-rose-950/10">
          <CardHeader>
            <CardTitle className="text-rose-100">Activate emergency alert</CardTitle>
            <CardDescription>
              This pushes a pulsing red overlay to targeted screens within seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleActivate}>
              <FormField label="Alert message">
                <Input
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Severe weather shelter in place"
                  required
                  value={message}
                />
              </FormField>

              <FormField label="Target zone">
                <Select
                  onChange={(event) =>
                    setZone(event.target.value as ContentZoneFilter)
                  }
                  value={zone}
                >
                  <option value="all">All screens</option>
                  <option value="lobby">Lobby only</option>
                  <option value="courtroom">Courtrooms only</option>
                  <option value="info">Info screens only</option>
                </Select>
              </FormField>

              <Button
                className="h-14 w-full text-base"
                disabled={!canEdit || submitting}
                type="submit"
                variant="destructive"
              >
                <ShieldAlert className="h-5 w-5" />
                {submitting ? "Publishing..." : "ACTIVATE EMERGENCY ALERT"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active alerts</CardTitle>
            <CardDescription>
              Clear any alert to immediately restore normal schedule and content
              playback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <LoadingCard title="Loading alerts..." />
            ) : alerts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-stone-300">
                No active emergency alerts.
              </div>
            ) : (
              alerts.map((alert) => (
                <article
                  className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-5"
                  key={alert.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-rose-200">
                        {alert.zoneFilter === "all"
                          ? "All screens"
                          : `${alert.zoneFilter} zone`}
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold text-white">
                        {alert.title}
                      </h3>
                      <p className="mt-3 text-sm text-rose-100">
                        Published {formatAdminDateTime(alert.createdAt)}
                      </p>
                    </div>
                    <AlarmSmoke className="h-6 w-6 text-rose-200" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      disabled={!canEdit || submitting}
                      onClick={() => handleClear(alert.zoneFilter)}
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear this target
                    </Button>
                    <Button
                      disabled={!canEdit || submitting}
                      onClick={() => handleClear("all")}
                      type="button"
                      variant="outline"
                    >
                      Clear all alerts
                    </Button>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
