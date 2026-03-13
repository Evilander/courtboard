import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAccountLockoutMinutes,
  getAuthRateLimitMaxAttempts,
  getAuthRateLimitWindowSeconds,
  getAuthUrl,
  getCourthouseName,
  getIdleTimeoutMinutes,
  getResolvedDatabasePath,
  getSessionMaxAgeSeconds,
} from "@/lib/env";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { SCREEN_ONLINE_WINDOW_MS } from "@/lib/time";

export default async function SettingsPage() {
  const session = await auth();

  if (!hasRequiredRole(session?.user?.role ?? "viewer", "admin")) {
    redirect("/dashboard");
  }

  const settings = [
    {
      label: "Courthouse Name",
      value: getCourthouseName(),
    },
    {
      label: "Auth URL",
      value: getAuthUrl(),
    },
    {
      label: "Session Max Age",
      value: `${Math.round(getSessionMaxAgeSeconds() / 60)} minutes`,
    },
    {
      label: "Idle Timeout",
      value: `${getIdleTimeoutMinutes()} minutes`,
    },
    {
      label: "Lockout Window",
      value: `${getAccountLockoutMinutes()} minutes`,
    },
    {
      label: "Auth Rate Limit",
      value: `${getAuthRateLimitMaxAttempts()} attempts / ${getAuthRateLimitWindowSeconds()} seconds`,
    },
    {
      label: "Screen Offline Threshold",
      value: `${Math.round(SCREEN_ONLINE_WINDOW_MS / 60_000)} minutes`,
    },
    {
      label: "SQLite File",
      value: getResolvedDatabasePath(),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Environment and policy settings
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">
          This deployment is configured through environment variables. These
          values are live runtime settings used by authentication, screen health,
          and display rendering.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {settings.map((setting) => (
          <Card key={setting.label}>
            <CardHeader className="pb-3">
              <CardDescription>{setting.label}</CardDescription>
              <CardTitle className="text-xl">{setting.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operational notes</CardTitle>
          <CardDescription>
            The display network expects Raspberry Pi kiosks to stay connected to
            the SSE stream and send heartbeats once per minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-300">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">SSE enabled</Badge>
            <Badge variant="success">Service worker registered</Badge>
            <Badge variant="success">SQLite + Drizzle</Badge>
          </div>
          <p>
            Use the Screens page to copy live display URLs for each Raspberry Pi.
            Emergency alerts publish immediately across the in-memory event bus
            and render as a full-screen takeover on every targeted display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
