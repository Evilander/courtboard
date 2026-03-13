"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/db/schema";
import type { SerializedUser } from "@/lib/serializers";
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
import { formatAdminDateTime } from "@/lib/time";

type CreateUserFormState = {
  username: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  totpEnabled: boolean;
};

type EditUserFormState = {
  id: string;
  username: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  totpEnabled: boolean;
  resetTotp: boolean;
};

function createUserForm(): CreateUserFormState {
  return {
    username: "",
    email: "",
    name: "",
    password: "",
    role: "viewer",
    totpEnabled: false,
  };
}

function editUserForm(user: SerializedUser): EditUserFormState {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    password: "",
    role: user.role,
    totpEnabled: user.totpEnabled,
    resetTotp: false,
  };
}

export function UsersPageClient() {
  const [users, setUsers] = useState<SerializedUser[]>([]);
  const [createForm, setCreateForm] = useState<CreateUserFormState>(createUserForm());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditUserFormState | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch<{ users: SerializedUser[] }>("/api/users");
        if (!cancelled) {
          setUsers(response.users);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load users.",
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
    const response = await apiFetch<{ users: SerializedUser[] }>("/api/users");
    setUsers(response.users);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setTotpSecret(null);
    setTotpUri(null);

    try {
      const response = await apiFetch<{
        user: SerializedUser;
        totpSecret: string | null;
        totpUri: string | null;
      }>("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      setSuccess("User created.");
      setCreateForm(createUserForm());
      setTotpSecret(response.totpSecret);
      setTotpUri(response.totpUri);
      await reload();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setTotpSecret(null);
    setTotpUri(null);

    try {
      const response = await apiFetch<{
        user: SerializedUser;
        totpSecret: string | null;
        totpUri: string | null;
      }>(`/api/users/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          password: editForm.password || undefined,
          totpEnabled: editForm.totpEnabled,
          resetTotp: editForm.resetTotp,
        }),
      });

      setSuccess("User updated.");
      setTotpSecret(response.totpSecret);
      setTotpUri(response.totpUri);
      setEditForm(editUserForm(response.user));
      await reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Provision staff accounts, assign roles, and manage MFA enrollment for CJIS-sensitive administrative access."
        eyebrow="Users"
        title="User administration"
      />

      <ErrorNotice message={error} />
      <SuccessNotice message={success} />

      {(totpSecret || totpUri) && (
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle>MFA enrollment details</CardTitle>
            <CardDescription>
              Capture this secret in the user’s authenticator app before closing the
              page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-stone-300">
            {totpSecret ? <p>Secret: {totpSecret}</p> : null}
            {totpUri ? <p>URI: {totpUri}</p> : null}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Staff accounts</CardTitle>
            <CardDescription>
              Select a user to change role, rotate password, or reset MFA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingCard title="Loading users..." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{user.username}</p>
                          <p className="text-xs text-stone-400">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.totpEnabled ? "Enabled" : "Disabled"}</TableCell>
                      <TableCell>{formatAdminDateTime(user.lastLoginAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setEditForm(editUserForm(user));
                              setError(null);
                              setSuccess(null);
                            }}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add user</CardTitle>
              <CardDescription>
                Create courthouse staff accounts with a strong initial password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreate}>
                <FormField label="Username">
                  <Input
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    required
                    value={createForm.username}
                  />
                </FormField>
                <FormField label="Full name">
                  <Input
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    value={createForm.name}
                  />
                </FormField>
                <FormField label="Email">
                  <Input
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    required
                    type="email"
                    value={createForm.email}
                  />
                </FormField>
                <FormField label="Temporary password">
                  <Input
                    minLength={12}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                    type="password"
                    value={createForm.password}
                  />
                </FormField>
                <FormField label="Role">
                  <Select
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        role: event.target.value as UserRole,
                      }))
                    }
                    value={createForm.role}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </Select>
                </FormField>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <Checkbox
                    checked={createForm.totpEnabled}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        totpEnabled: event.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm text-stone-200">Enable MFA immediately</span>
                </label>
                <Button disabled={saving} type="submit">
                  Create user
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedUserId ? "Edit user" : "Select a user"}</CardTitle>
              <CardDescription>
                Reset passwords, rotate MFA secrets, and change role assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!editForm ? (
                <p className="text-sm text-stone-400">
                  Choose a staff account from the table to edit it.
                </p>
              ) : (
                <form className="space-y-4" onSubmit={handleUpdate}>
                  <FormField label="Username">
                    <Input disabled value={editForm.username} />
                  </FormField>
                  <FormField label="Full name">
                    <Input
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : current,
                        )
                      }
                      required
                      value={editForm.name}
                    />
                  </FormField>
                  <FormField label="Email">
                    <Input
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, email: event.target.value }
                            : current,
                        )
                      }
                      required
                      type="email"
                      value={editForm.email}
                    />
                  </FormField>
                  <FormField label="Role">
                    <Select
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, role: event.target.value as UserRole }
                            : current,
                        )
                      }
                      value={editForm.role}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </FormField>
                  <FormField label="Reset password">
                    <Input
                      minLength={12}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, password: event.target.value }
                            : current,
                        )
                      }
                      placeholder="Leave blank to keep current password"
                      type="password"
                      value={editForm.password}
                    />
                  </FormField>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <Checkbox
                      checked={editForm.totpEnabled}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, totpEnabled: event.target.checked }
                            : current,
                        )
                      }
                    />
                    <span className="text-sm text-stone-200">MFA enabled</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <Checkbox
                      checked={editForm.resetTotp}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, resetTotp: event.target.checked }
                            : current,
                        )
                      }
                    />
                    <span className="text-sm text-stone-200">Reset MFA secret</span>
                  </label>
                  <div className="flex gap-3">
                    <Button disabled={saving} type="submit">
                      Save changes
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedUserId(null);
                        setEditForm(null);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
