import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getIdleTimeoutMinutes } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <AdminShell idleTimeoutMinutes={getIdleTimeoutMinutes()} user={session.user}>
      {children}
    </AdminShell>
  );
}
