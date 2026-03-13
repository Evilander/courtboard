import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { ScreensPageClient } from "@/components/admin/screens-page";

export default async function ScreensPage() {
  const session = await auth();

  return (
    <ScreensPageClient
      canEdit={hasRequiredRole(session?.user?.role ?? "viewer", "editor")}
    />
  );
}
