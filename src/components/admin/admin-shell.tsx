"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlarmSmoke,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Newspaper,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminIdleSession } from "@/components/admin/admin-idle-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasRequiredRole } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
  idleTimeoutMinutes: number;
  user: {
    name?: string | null;
    username?: string | null;
    role: UserRole;
  };
};

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    role: "viewer",
  },
  {
    href: "/schedules",
    label: "Schedules",
    icon: ClipboardList,
    role: "viewer",
  },
  {
    href: "/content",
    label: "Content",
    icon: Newspaper,
    role: "viewer",
  },
  {
    href: "/screens",
    label: "Screens",
    icon: MonitorSmartphone,
    role: "viewer",
  },
  {
    href: "/alerts",
    label: "Emergency",
    icon: AlarmSmoke,
    role: "viewer",
  },
  {
    href: "/audit-log",
    label: "Audit Log",
    icon: ShieldCheck,
    role: "admin",
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
    role: "admin",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    role: "admin",
  },
] as const;

export function AdminShell({
  children,
  idleTimeoutMinutes,
  user,
}: AdminShellProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) =>
    hasRequiredRole(user.role, item.role),
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_28%),linear-gradient(180deg,#111111_0%,#050505_100%)]">
      <AdminIdleSession idleTimeoutMinutes={idleTimeoutMinutes} />
      <div className="mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[280px,1fr]">
        <aside className="border-b border-white/10 bg-black/25 backdrop-blur lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-5 py-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
                CourtBoard
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-white">
                Courthouse Operations
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Live schedules, signage content, and emergency controls for every
                courthouse screen.
              </p>
            </div>

            <nav className="mt-6 space-y-1">
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-amber-300 text-stone-950"
                        : "text-stone-300 hover:bg-white/[0.04] hover:text-white",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-400">
                    Signed In
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {user.name || user.username || "CourtBoard User"}
                  </p>
                  <p className="mt-1 text-sm text-stone-300">
                    @{user.username || "user"}
                  </p>
                </div>
                <Badge variant={user.role === "admin" ? "success" : "default"}>
                  {user.role}
                </Badge>
              </div>

              <Button
                className="mt-5 w-full justify-center"
                onClick={() => signOut({ callbackUrl: "/login" })}
                type="button"
                variant="secondary"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
