"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, MonitorSmartphone, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  EmptyCard,
  ErrorNotice,
  FormField,
  LoadingCard,
  StatusBadge,
  SuccessNotice,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/client/api";
import type { ScreenZone } from "@/lib/db/schema";
import type { SerializedScreen } from "@/lib/serializers";
import { formatAdminDateTime, formatRelativeLastSeen } from "@/lib/time";

type ScreensPageClientProps = {
  canEdit: boolean;
};

type ScreenFormState = {
  name: string;
  slug: string;
  zone: ScreenZone;
  locationDescription: string;
  rotationIntervalSeconds: string;
  isActive: boolean;
};

function createEmptyScreenForm(): ScreenFormState {
  return {
    name: "",
    slug: "",
    zone: "lobby",
    locationDescription: "",
    rotationIntervalSeconds: "15",
    isActive: true,
  };
}

function screenToForm(screen: SerializedScreen): ScreenFormState {
  return {
    name: screen.name,
    slug: screen.slug,
    zone: screen.zone,
    locationDescription: screen.locationDescription ?? "",
    rotationIntervalSeconds: String(screen.rotationIntervalSeconds),
    isActive: screen.isActive,
  };
}

export function ScreensPageClient({ canEdit }: ScreensPageClientProps) {
  const [screens, setScreens] = useState<SerializedScreen[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScreenFormState>(createEmptyScreenForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<{ screens: SerializedScreen[] }>("/api/screens");
        if (!cancelled) {
          setScreens(response.screens);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load screens.",
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
  }, []);

  async function reload() {
    const response = await apiFetch<{ screens: SerializedScreen[] }>("/api/screens");
    setScreens(response.screens);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...form,
        locationDescription: form.locationDescription || null,
        rotationIntervalSeconds: Number(form.rotationIntervalSeconds),
      };

      if (editingId) {
        await apiFetch(`/api/screens/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Screen updated.");
      } else {
        await apiFetch("/api/screens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Screen created.");
      }

      setEditingId(null);
      setForm(createEmptyScreenForm());
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save screen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(screen: SerializedScreen) {
    if (!canEdit || !window.confirm(`Delete screen "${screen.name}"?`)) {
      return;
    }

    try {
      await apiFetch(`/api/screens/${screen.id}`, { method: "DELETE" });
      if (editingId === screen.id) {
        setEditingId(null);
        setForm(createEmptyScreenForm());
      }
      setSuccess("Screen deleted.");
      await reload();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete screen.",
      );
    }
  }

  async function handleCopyUrl(slug: string) {
    const url = `${window.location.origin}/display/${slug}`;
    await navigator.clipboard.writeText(url);
    setSuccess(`Copied ${url}`);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actions={
          canEdit ? (
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(createEmptyScreenForm());
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New Screen
            </Button>
          ) : null
        }
        description="Register physical displays, monitor heartbeat status, and manage the URLs used by Raspberry Pi kiosks."
        eyebrow="Screens"
        title="Display fleet management"
      />

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Registered screens</CardTitle>
            <CardDescription>
              Preview URLs open the production display view in a new tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingCard title="Loading screens..." />
            ) : screens.length === 0 ? (
              <EmptyCard
                description="Create the first screen to begin routing content to physical displays."
                title="No screens registered"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rotation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screens.map((screen) => (
                    <TableRow key={screen.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{screen.name}</p>
                          <p className="text-xs text-stone-400">{screen.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell className="uppercase text-stone-300">
                        {screen.zone}
                      </TableCell>
                      <TableCell>{screen.locationDescription || "Unassigned"}</TableCell>
                      <TableCell>{screen.rotationIntervalSeconds}s</TableCell>
                      <TableCell>
                        <StatusBadge health={screen.health} online={screen.online} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{formatAdminDateTime(screen.lastSeenAt)}</p>
                          <p className="text-xs text-stone-400">
                            {formatRelativeLastSeen(screen.lastSeenAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => {
                              setEditingId(screen.id);
                              setForm(screenToForm(screen));
                              setError(null);
                              setSuccess(null);
                            }}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleCopyUrl(screen.slug)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Copy className="h-4 w-4" />
                            Copy URL
                          </Button>
                          <Button
                            onClick={() => handleDelete(screen)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                          <Link
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/5"
                            href={`/display/${screen.slug}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Preview
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit screen" : "Add screen"}</CardTitle>
            <CardDescription>
              Set the display slug, zone, and heartbeat configuration used by the
              kiosk client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <FormField label="Screen name">
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  value={form.name}
                />
              </FormField>

              <FormField label="Slug" description="Used in /display/[slug] URLs.">
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  required
                  value={form.slug}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Zone">
                  <Select
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        zone: event.target.value as ScreenZone,
                      }))
                    }
                    value={form.zone}
                  >
                    <option value="lobby">Lobby</option>
                    <option value="courtroom">Courtroom</option>
                    <option value="info">Info</option>
                  </Select>
                </FormField>

                <FormField label="Rotation interval (seconds)">
                  <Input
                    min={5}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rotationIntervalSeconds: event.target.value,
                      }))
                    }
                    required
                    type="number"
                    value={form.rotationIntervalSeconds}
                  />
                </FormField>
              </div>

              <FormField label="Location description">
                <Input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      locationDescription: event.target.value,
                    }))
                  }
                  placeholder="South lobby entrance"
                  value={form.locationDescription}
                />
              </FormField>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Checkbox
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-stone-200">Screen is active</span>
              </label>

              <div className="flex flex-wrap gap-3">
                <Button disabled={!canEdit || saving} type="submit">
                  <MonitorSmartphone className="h-4 w-4" />
                  {saving ? "Saving..." : editingId ? "Update screen" : "Create screen"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setForm(createEmptyScreenForm());
                    setError(null);
                    setSuccess(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
