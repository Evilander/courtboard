"use client";

import { useEffect, useState } from "react";
import type { SerializedAudit, SerializedUser } from "@/lib/serializers";
import { apiFetch } from "@/lib/client/api";
import { AdminPageHeader, ErrorNotice, FormField, LoadingCard } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatAdminDateTime } from "@/lib/time";

type AuditResponse = {
  items: SerializedAudit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function AuditLogPageClient() {
  const [items, setItems] = useState<SerializedAudit[]>([]);
  const [users, setUsers] = useState<SerializedUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const query = new URLSearchParams({
          page: String(page),
          pageSize: "25",
        });

        if (action) {
          query.set("action", action);
        }
        if (userId) {
          query.set("userId", userId);
        }
        if (from) {
          query.set("from", from);
        }
        if (to) {
          query.set("to", to);
        }

        const [audit, userResponse] = await Promise.all([
          apiFetch<AuditResponse>(`/api/audit?${query.toString()}`),
          apiFetch<{ users: SerializedUser[] }>("/api/users"),
        ]);

        if (cancelled) {
          return;
        }

        setItems(audit.items);
        setTotalPages(audit.totalPages);
        setTotal(audit.total);
        setUsers(userResponse.users);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load audit log.",
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
  }, [action, from, page, to, userId]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Review authenticated changes, imports, and operational events with filterable search and pagination."
        eyebrow="Audit Log"
        title="Traceable system activity"
      />

      <ErrorNotice message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow the log by action name, user, and date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Action">
              <Input
                onChange={(event) => {
                  setPage(1);
                  setAction(event.target.value);
                }}
                placeholder="schedule.update"
                value={action}
              />
            </FormField>
            <FormField label="User">
              <Select
                onChange={(event) => {
                  setPage(1);
                  setUserId(event.target.value);
                }}
                value={userId}
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="From">
              <Input
                onChange={(event) => {
                  setPage(1);
                  setFrom(event.target.value);
                }}
                type="date"
                value={from}
              />
            </FormField>
            <FormField label="To">
              <Input
                onChange={(event) => {
                  setPage(1);
                  setTo(event.target.value);
                }}
                type="date"
                value={to}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit entries</CardTitle>
          <CardDescription>{total} total records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingCard title="Loading audit log..." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatAdminDateTime(entry.createdAt)}</TableCell>
                      <TableCell>
                        <div>
                          <p>{entry.username || "System"}</p>
                          <p className="text-xs text-stone-400">{entry.userRole || "n/a"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>
                        <div>
                          <p>{entry.entityType}</p>
                          <p className="text-xs text-stone-400">
                            {entry.entityId || "n/a"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[420px]">
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-stone-300">
                          {JSON.stringify(entry.details ?? {}, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-stone-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-3">
                  <Button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
