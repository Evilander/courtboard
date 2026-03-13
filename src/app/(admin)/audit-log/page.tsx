import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { AuditLogPageClient } from "@/components/admin/audit-log-page";

export default async function AuditLogPage() {
  const session = await auth();

  if (!hasRequiredRole(session?.user?.role ?? "viewer", "admin")) {
    redirect("/dashboard");
  }

  return <AuditLogPageClient />;
}
