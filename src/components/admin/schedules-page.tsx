"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCheck,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { ScheduleStatus } from "@/lib/db/schema";
import type { SerializedSchedule, SerializedScreen } from "@/lib/serializers";
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
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toDateKey } from "@/lib/time";

const SCHEDULE_PAGE_SIZE = 20;

type SchedulesPageClientProps = {
  canEdit: boolean;
};

type ScheduleFormState = {
  screenId: string;
  caseNumber: string;
  caseTitle: string;
  caseType: string;
  judgeName: string;
  courtroom: string;
  scheduledTime: string;
  estimatedDuration: string;
  status: ScheduleStatus;
  date: string;
};

type ScheduleImportPreview = {
  headers: string[];
  suggestedMapping: Record<string, string>;
  preview: Record<string, string>[];
  totalRows: number;
};

const IMPORT_FIELDS = [
  ["caseNumber", "Case number"],
  ["caseTitle", "Case title"],
  ["caseType", "Case type"],
  ["judgeName", "Judge"],
  ["courtroom", "Courtroom"],
  ["scheduledTime", "Time"],
  ["estimatedDuration", "Duration"],
  ["status", "Status"],
  ["date", "Date"],
] as const;

function createEmptyScheduleForm(date: string): ScheduleFormState {
  return {
    screenId: "",
    caseNumber: "",
    caseTitle: "",
    caseType: "",
    judgeName: "",
    courtroom: "",
    scheduledTime: "09:00",
    estimatedDuration: "",
    status: "scheduled",
    date,
  };
}

function scheduleToForm(entry: SerializedSchedule): ScheduleFormState {
  return {
    screenId: entry.screenId ?? "",
    caseNumber: entry.caseNumber,
    caseTitle: entry.caseTitle,
    caseType: entry.caseType,
    judgeName: entry.judgeName,
    courtroom: entry.courtroom,
    scheduledTime: entry.scheduledTime,
    estimatedDuration: entry.estimatedDuration ? String(entry.estimatedDuration) : "",
    status: entry.status,
    date: entry.date,
  };
}

export function SchedulesPageClient({ canEdit }: SchedulesPageClientProps) {
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [entries, setEntries] = useState<SerializedSchedule[]>([]);
  const [screens, setScreens] = useState<SerializedScreen[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(() =>
    createEmptyScheduleForm(toDateKey()),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ScheduleImportPreview | null>(
    null,
  );
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadScreens() {
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
      }
    }

    void loadScreens();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedules() {
      try {
        setLoading(true);
        const response = await apiFetch<{ entries: SerializedSchedule[] }>(
          `/api/schedules?date=${encodeURIComponent(selectedDate)}`,
        );
        if (!cancelled) {
          setEntries(response.entries);
          setSelectedIds([]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load schedule entries.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSchedules();
    setForm((current) => ({ ...current, date: selectedDate }));
    setPage(1);
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.courtroom.toLowerCase().includes(q) ||
        entry.judgeName.toLowerCase().includes(q) ||
        entry.caseNumber.toLowerCase().includes(q) ||
        entry.caseTitle.toLowerCase().includes(q),
    );
  }, [entries, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / SCHEDULE_PAGE_SIZE));
  const paginatedEntries = useMemo(
    () =>
      filteredEntries.slice(
        (page - 1) * SCHEDULE_PAGE_SIZE,
        page * SCHEDULE_PAGE_SIZE,
      ),
    [filteredEntries, page],
  );

  const allSelected = useMemo(
    () => paginatedEntries.length > 0 && selectedIds.length === paginatedEntries.length,
    [paginatedEntries.length, selectedIds.length],
  );

  async function reloadEntries() {
    const response = await apiFetch<{ entries: SerializedSchedule[] }>(
      `/api/schedules?date=${encodeURIComponent(selectedDate)}`,
    );
    setEntries(response.entries);
    setSelectedIds([]);
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
        screenId: form.screenId || null,
        estimatedDuration: form.estimatedDuration
          ? Number(form.estimatedDuration)
          : null,
      };

      if (editingId) {
        await apiFetch(`/api/schedules/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Schedule entry updated.");
      } else {
        await apiFetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Schedule entry created.");
      }

      setEditingId(null);
      setForm(createEmptyScheduleForm(selectedDate));
      await reloadEntries();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save schedule entry.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: SerializedSchedule) {
    if (!canEdit || !window.confirm(`Delete ${entry.caseNumber}?`)) {
      return;
    }

    try {
      await apiFetch(`/api/schedules/${entry.id}`, { method: "DELETE" });
      setSuccess("Schedule entry deleted.");
      if (editingId === entry.id) {
        setEditingId(null);
        setForm(createEmptyScheduleForm(selectedDate));
      }
      await reloadEntries();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete schedule entry.",
      );
    }
  }

  async function handleBulk(action: "mark_completed" | "delete") {
    if (!canEdit || selectedIds.length === 0) {
      return;
    }

    const label =
      action === "mark_completed" ? "mark the selected matters completed" : "delete the selected matters";
    if (!window.confirm(`Continue and ${label}?`)) {
      return;
    }

    try {
      await apiFetch("/api/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      setSuccess(
        action === "mark_completed"
          ? "Selected matters marked completed."
          : "Selected matters deleted.",
      );
      await reloadEntries();
    } catch (bulkError) {
      setError(
        bulkError instanceof Error ? bulkError.message : "Unable to run bulk action.",
      );
    }
  }

  async function handlePreviewImport() {
    if (!importFile) {
      setError("Choose a CSV file before previewing.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mode", "preview");

      const response = await apiFetch<ScheduleImportPreview>(
        "/api/schedules/import",
        {
          method: "POST",
          body: formData,
        },
      );

      setImportPreview(response);
      setImportMapping(response.suggestedMapping);
      setSuccess(`Preview ready for ${response.totalRows} CSV rows.`);
    } catch (previewError) {
      setError(
        previewError instanceof Error ? previewError.message : "Unable to preview CSV.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmImport() {
    if (!importFile || !importPreview) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mode", "import");
      formData.append("mapping", JSON.stringify(importMapping));

      const response = await apiFetch<{ imported: SerializedSchedule[] }>(
        "/api/schedules/import",
        {
          method: "POST",
          body: formData,
        },
      );

      setSuccess(`Imported ${response.imported.length} schedule entries.`);
      setImportFile(null);
      setImportPreview(null);
      setImportMapping({});
      await reloadEntries();
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Unable to import CSV.",
      );
    } finally {
      setSaving(false);
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
                setForm(createEmptyScheduleForm(selectedDate));
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          ) : null
        }
        description="Manage the daily docket, assign screens, and import schedule data from JIMS-style CSV exports."
        eyebrow="Schedules"
        title="Schedule management"
      />

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Daily docket</CardTitle>
            <CardDescription>
              Filter by date, edit individual matters, or apply bulk actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-full max-w-[11rem]">
                  <FormField label="Schedule date">
                    <Input
                      onChange={(event) => setSelectedDate(event.target.value)}
                      type="date"
                      value={selectedDate}
                    />
                  </FormField>
                </div>
                <div className="w-full max-w-xs">
                  <FormField label="Search">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                      <Input
                        className="pl-9"
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          setPage(1);
                        }}
                        placeholder="Judge, courtroom, case..."
                        value={searchQuery}
                      />
                    </div>
                  </FormField>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!canEdit || selectedIds.length === 0}
                  onClick={() => handleBulk("mark_completed")}
                  type="button"
                  variant="secondary"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark Completed
                </Button>
                <Button
                  disabled={!canEdit || selectedIds.length === 0}
                  onClick={() => handleBulk("delete")}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>

            {loading ? (
              <LoadingCard title="Loading schedule entries..." />
            ) : entries.length === 0 ? (
              <EmptyCard
                description="There are no cases on the docket for this date."
                title="No schedule entries"
              />
            ) : filteredEntries.length === 0 ? (
              <EmptyCard
                description={`No results match "${searchQuery}".`}
                title="No matching entries"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={allSelected}
                        onChange={(event) =>
                          setSelectedIds(
                            event.target.checked
                              ? paginatedEntries.map((entry) => entry.id)
                              : [],
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Judge</TableHead>
                    <TableHead>Courtroom</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onChange={(event) =>
                            setSelectedIds((current) =>
                              event.target.checked
                                ? [...current, entry.id]
                                : current.filter((id) => id !== entry.id),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>{entry.scheduledTime}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{entry.caseNumber}</p>
                          <p className="text-xs text-stone-400">{entry.caseTitle}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.caseType}</TableCell>
                      <TableCell>{entry.judgeName}</TableCell>
                      <TableCell>{entry.courtroom}</TableCell>
                      <TableCell>{entry.status.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => {
                              setEditingId(entry.id);
                              setForm(scheduleToForm(entry));
                            }}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(entry)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {filteredEntries.length > 0 && (
              <div className="flex items-center justify-between pt-2 text-sm text-stone-400">
                <span>
                  {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                  {searchQuery.trim() ? ` matching "${searchQuery}"` : ""}
                </span>
                <Pagination
                  onPageChange={setPage}
                  page={page}
                  totalPages={totalPages}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit matter" : "Add matter"}</CardTitle>
              <CardDescription>
                Assign the matter to a display slug or leave unassigned for courtroom auto-match.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Date">
                    <Input
                      onChange={(event) =>
                        setForm((current) => ({ ...current, date: event.target.value }))
                      }
                      required
                      type="date"
                      value={form.date}
                    />
                  </FormField>
                  <FormField label="Scheduled time">
                    <Input
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scheduledTime: event.target.value,
                        }))
                      }
                      required
                      type="time"
                      value={form.scheduledTime}
                    />
                  </FormField>
                </div>

                <FormField label="Assigned screen">
                  <Select
                    onChange={(event) =>
                      setForm((current) => ({ ...current, screenId: event.target.value }))
                    }
                    value={form.screenId}
                  >
                    <option value="">Auto-match by courtroom</option>
                    {screens.map((screen) => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name} ({screen.slug})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Case number">
                  <Input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        caseNumber: event.target.value,
                      }))
                    }
                    required
                    value={form.caseNumber}
                  />
                </FormField>
                <FormField label="Case title">
                  <Input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        caseTitle: event.target.value,
                      }))
                    }
                    required
                    value={form.caseTitle}
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Case type">
                    <Input
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          caseType: event.target.value,
                        }))
                      }
                      required
                      value={form.caseType}
                    />
                  </FormField>
                  <FormField label="Status">
                    <Select
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as ScheduleStatus,
                        }))
                      }
                      value={form.status}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="continued">Continued</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Judge">
                    <Input
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          judgeName: event.target.value,
                        }))
                      }
                      required
                      value={form.judgeName}
                    />
                  </FormField>
                  <FormField label="Courtroom">
                    <Input
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          courtroom: event.target.value,
                        }))
                      }
                      required
                      value={form.courtroom}
                    />
                  </FormField>
                </div>

                <FormField label="Estimated duration (minutes)">
                  <Input
                    min={0}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estimatedDuration: event.target.value,
                      }))
                    }
                    type="number"
                    value={form.estimatedDuration}
                  />
                </FormField>

                <div className="flex gap-3">
                  <Button disabled={!canEdit || saving} type="submit">
                    <CalendarDays className="h-4 w-4" />
                    {saving ? "Saving..." : editingId ? "Update entry" : "Create entry"}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingId(null);
                      setForm(createEmptyScheduleForm(selectedDate));
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

          <Card>
            <CardHeader>
              <CardTitle>CSV import</CardTitle>
              <CardDescription>
                Upload a CSV export, confirm the detected column mapping, and import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="CSV file">
                <Input
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setImportFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </FormField>

              <div className="flex gap-3">
                <Button
                  disabled={!canEdit || saving || !importFile}
                  onClick={handlePreviewImport}
                  type="button"
                  variant="secondary"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Preview Import
                </Button>
                <Button
                  disabled={!canEdit || saving || !importPreview}
                  onClick={handleConfirmImport}
                  type="button"
                >
                  <Upload className="h-4 w-4" />
                  Confirm Import
                </Button>
              </div>

              {importPreview ? (
                <div className="space-y-4">
                  <p className="text-sm text-stone-300">
                    {importPreview.totalRows} rows ready to import.
                  </p>

                  <div className="grid gap-3">
                    {IMPORT_FIELDS.map(([field, label]) => (
                      <FormField key={field} label={label}>
                        <Select
                          onChange={(event) =>
                            setImportMapping((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }))
                          }
                          value={importMapping[field] ?? ""}
                        >
                          <option value="">Ignore column</option>
                          {importPreview.headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {importPreview.headers.map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.preview.map((row, index) => (
                          <TableRow key={`${index}-${row[importPreview.headers[0]] ?? ""}`}>
                            {importPreview.headers.map((header) => (
                              <TableCell key={header}>{row[header]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
