"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ExternalLink,
  ImagePlus,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ContentType, ContentZoneFilter } from "@/lib/db/schema";
import type { SerializedContent, SerializedScreen } from "@/lib/serializers";
import { apiFetch } from "@/lib/client/api";
import {
  AdminPageHeader,
  EmptyCard,
  ErrorNotice,
  FormField,
  LoadingCard,
  SuccessNotice,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeLocalValue } from "@/lib/time";

type ContentPageClientProps = {
  canEdit: boolean;
};

type ContentFormState = {
  type: ContentType;
  title: string;
  body: string;
  imagePath: string;
  displayOrder: string;
  zoneFilter: ContentZoneFilter;
  startsAt: string;
  expiresAt: string;
  isEmergency: boolean;
};

function createEmptyContentForm(): ContentFormState {
  return {
    type: "announcement",
    title: "",
    body: "",
    imagePath: "",
    displayOrder: "0",
    zoneFilter: "all",
    startsAt: "",
    expiresAt: "",
    isEmergency: false,
  };
}

function contentToForm(item: SerializedContent): ContentFormState {
  return {
    type: item.type,
    title: item.title,
    body: item.body ?? "",
    imagePath: item.imagePath ?? "",
    displayOrder: String(item.displayOrder),
    zoneFilter: item.zoneFilter,
    startsAt: toDateTimeLocalValue(item.startsAt),
    expiresAt: toDateTimeLocalValue(item.expiresAt),
    isEmergency: item.isEmergency,
  };
}

function buildContentPayload(form: ContentFormState, imagePath: string) {
  return {
    type: form.type,
    title: form.title,
    body: form.body || null,
    imagePath: imagePath || null,
    displayOrder: Number(form.displayOrder || "0"),
    zoneFilter: form.zoneFilter,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    isEmergency: form.isEmergency,
  };
}

function getPreviewHref(
  zone: ContentZoneFilter,
  screens: SerializedScreen[],
) {
  if (screens.length === 0) {
    return null;
  }

  if (zone === "all") {
    return `/display/${screens.find((screen) => screen.zone === "lobby")?.slug ?? screens[0]?.slug}`;
  }

  return `/display/${screens.find((screen) => screen.zone === zone)?.slug ?? screens[0]?.slug}`;
}

function reorderItems(items: SerializedContent[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((item, index) => ({ ...item, displayOrder: index }));
}

export function ContentPageClient({ canEdit }: ContentPageClientProps) {
  const [items, setItems] = useState<SerializedContent[]>([]);
  const [screens, setScreens] = useState<SerializedScreen[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [form, setForm] = useState<ContentFormState>(createEmptyContentForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [contentResponse, screenResponse] = await Promise.all([
          apiFetch<{ items: SerializedContent[] }>("/api/content"),
          apiFetch<{ screens: SerializedScreen[] }>("/api/screens"),
        ]);

        if (!cancelled) {
          setItems(
            [...contentResponse.items].sort(
              (left, right) => left.displayOrder - right.displayOrder,
            ),
          );
          setScreens(screenResponse.screens);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load content.",
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

  const previewHref = useMemo(
    () => getPreviewHref(form.zoneFilter, screens),
    [form.zoneFilter, screens],
  );

  async function reload() {
    const response = await apiFetch<{ items: SerializedContent[] }>("/api/content");
    setItems(
      [...response.items].sort((left, right) => left.displayOrder - right.displayOrder),
    );
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      return form.imagePath;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    const response = await apiFetch<{ imagePath: string }>("/api/content/upload", {
      method: "POST",
      body: formData,
    });
    return response.imagePath;
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
      const imagePath = form.type === "image" ? await uploadSelectedFile() : "";
      const payload = buildContentPayload(form, imagePath);

      if (editingId) {
        await apiFetch(`/api/content/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Content item updated.");
      } else {
        await apiFetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Content item created.");
      }

      setEditingId(null);
      setSelectedFile(null);
      setForm(createEmptyContentForm());
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save content.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: SerializedContent) {
    if (!canEdit || !window.confirm(`Delete "${item.title}"?`)) {
      return;
    }

    try {
      await apiFetch(`/api/content/${item.id}`, { method: "DELETE" });
      setSuccess("Content item deleted.");
      if (editingId === item.id) {
        setEditingId(null);
        setSelectedFile(null);
        setForm(createEmptyContentForm());
      }
      await reload();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete content.",
      );
    }
  }

  async function persistOrder(nextItems: SerializedContent[]) {
    await Promise.all(
      nextItems.map((item) =>
        apiFetch(`/api/content/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            title: item.title,
            body: item.body,
            imagePath: item.imagePath,
            displayOrder: item.displayOrder,
            zoneFilter: item.zoneFilter,
            startsAt: item.startsAt,
            expiresAt: item.expiresAt,
            isEmergency: item.isEmergency,
          }),
        }),
      ),
    );
  }

  async function handleDrop(targetId: string) {
    if (!canEdit || !draggedId || draggedId === targetId) {
      return;
    }

    const reordered = reorderItems(items, draggedId, targetId);
    setItems(reordered);
    setDraggedId(null);

    try {
      await persistOrder(reordered);
      setSuccess("Display order updated.");
    } catch (orderError) {
      setError(
        orderError instanceof Error ? orderError.message : "Unable to update order.",
      );
      await reload();
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actions={
          canEdit ? (
            <Button
              onClick={() => {
                setEditingId(null);
                setSelectedFile(null);
                setForm(createEmptyContentForm());
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New Content
            </Button>
          ) : null
        }
        description="Manage announcements, image slides, and HTML content blocks. Drag cards to change display order."
        eyebrow="Content"
        title="Content management"
      />

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Content library</CardTitle>
            <CardDescription>
              Preview each content item and drag to persist display order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingCard title="Loading content..." />
            ) : items.length === 0 ? (
              <EmptyCard
                description="Create announcements, images, or HTML panels to populate displays."
                title="No content items"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                  <article
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    draggable={canEdit}
                    key={item.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={() => setDraggedId(item.id)}
                    onDrop={() => {
                      void handleDrop(item.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                          {item.type} · {item.zoneFilter}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">
                          {item.title}
                        </h3>
                      </div>
                      <ArrowUpDown className="h-5 w-5 text-stone-500" />
                    </div>

                    {item.type === "image" && item.imagePath ? (
                      <img
                        alt={item.title}
                        className="mt-4 h-48 w-full rounded-2xl object-cover"
                        src={item.imagePath}
                      />
                    ) : item.type === "html" ? (
                      <div
                        className="prose prose-invert mt-4 max-w-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 prose-p:text-stone-300"
                        dangerouslySetInnerHTML={{ __html: item.body ?? "" }}
                      />
                    ) : (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-300">
                        {item.body}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone-500">
                      <span>Order {item.displayOrder}</span>
                      <span>{item.startsAt ? "Scheduled" : "Always on"}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          setEditingId(item.id);
                          setSelectedFile(null);
                          setForm(contentToForm(item));
                        }}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(item)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      {getPreviewHref(item.zoneFilter, screens) ? (
                        <Link
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/5"
                          href={getPreviewHref(item.zoneFilter, screens) as string}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Preview
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit content" : "Add content"}</CardTitle>
            <CardDescription>
              Use announcements for text, image slides for signage, and HTML for rich layouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <FormField label="Content type">
                <Select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as ContentType,
                    }))
                  }
                  value={form.type}
                >
                  <option value="announcement">Announcement</option>
                  <option value="image">Image</option>
                  <option value="html">Raw HTML</option>
                </Select>
              </FormField>

              <FormField label="Title">
                <Input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                  value={form.title}
                />
              </FormField>

              {form.type === "image" ? (
                <>
                  <FormField label="Upload image">
                    <Input
                      accept="image/*"
                      onChange={(event) =>
                        setSelectedFile(event.target.files?.[0] ?? null)
                      }
                      type="file"
                    />
                  </FormField>
                  <FormField label="Image caption">
                    <Textarea
                      onChange={(event) =>
                        setForm((current) => ({ ...current, body: event.target.value }))
                      }
                      value={form.body}
                    />
                  </FormField>
                </>
              ) : (
                <FormField
                  label={form.type === "html" ? "HTML markup" : "Announcement body"}
                >
                  <Textarea
                    onChange={(event) =>
                      setForm((current) => ({ ...current, body: event.target.value }))
                    }
                    placeholder={
                      form.type === "html"
                        ? "<h1>County services</h1>"
                        : "Markdown-style announcement copy"
                    }
                    value={form.body}
                  />
                </FormField>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Zone filter">
                  <Select
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        zoneFilter: event.target.value as ContentZoneFilter,
                      }))
                    }
                    value={form.zoneFilter}
                  >
                    <option value="all">All screens</option>
                    <option value="lobby">Lobby</option>
                    <option value="courtroom">Courtroom</option>
                    <option value="info">Info</option>
                  </Select>
                </FormField>
                <FormField label="Display order">
                  <Input
                    min={0}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        displayOrder: event.target.value,
                      }))
                    }
                    type="number"
                    value={form.displayOrder}
                  />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Starts at">
                  <Input
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startsAt: event.target.value }))
                    }
                    type="datetime-local"
                    value={form.startsAt}
                  />
                </FormField>
                <FormField label="Expires at">
                  <Input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={form.expiresAt}
                  />
                </FormField>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Checkbox
                  checked={form.isEmergency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isEmergency: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm text-stone-200">
                  Treat as emergency takeover content
                </span>
              </label>

              <div className="flex flex-wrap gap-3">
                <Button disabled={!canEdit || saving} type="submit">
                  {form.type === "image" ? (
                    <ImagePlus className="h-4 w-4" />
                  ) : (
                    <Newspaper className="h-4 w-4" />
                  )}
                  {saving ? "Saving..." : editingId ? "Update content" : "Create content"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setSelectedFile(null);
                    setForm(createEmptyContentForm());
                  }}
                  type="button"
                  variant="outline"
                >
                  Reset
                </Button>
                {previewHref ? (
                  <Link
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium text-white hover:bg-white/5"
                    href={previewHref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Preview
                  </Link>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
