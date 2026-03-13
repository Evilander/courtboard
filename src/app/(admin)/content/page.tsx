import { auth } from "@/auth";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { ContentPageClient } from "@/components/admin/content-page";

export default async function ContentPage() {
  const session = await auth();

  return (
    <ContentPageClient
      canEdit={hasRequiredRole(session?.user?.role ?? "viewer", "editor")}
    />
  );
}
