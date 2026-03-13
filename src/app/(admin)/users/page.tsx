import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { UsersPageClient } from "@/components/admin/users-page";

export default async function UsersPage() {
  const session = await auth();

  if (!hasRequiredRole(session?.user?.role ?? "viewer", "admin")) {
    redirect("/dashboard");
  }

  return <UsersPageClient />;
}
