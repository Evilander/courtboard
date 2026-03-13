import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { AlertsPageClient } from "@/components/admin/alerts-page";

export default async function AlertsPage() {
  const session = await auth();

  return (
    <AlertsPageClient
      canEdit={hasRequiredRole(session?.user?.role ?? "viewer", "editor")}
    />
  );
}
