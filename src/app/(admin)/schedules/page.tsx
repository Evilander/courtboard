import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { SchedulesPageClient } from "@/components/admin/schedules-page";

export default async function SchedulesPage() {
  const session = await auth();

  return (
    <SchedulesPageClient
      canEdit={hasRequiredRole(session?.user?.role ?? "viewer", "editor")}
    />
  );
}
