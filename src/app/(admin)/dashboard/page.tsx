import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { DashboardPageClient } from "@/components/admin/dashboard-page";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <DashboardPageClient
      canEdit={hasRequiredRole(session?.user?.role ?? "viewer", "editor")}
      isAdmin={hasRequiredRole(session?.user?.role ?? "viewer", "admin")}
    />
  );
}
