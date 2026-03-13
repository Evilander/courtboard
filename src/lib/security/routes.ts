const ADMIN_PAGE_PREFIXES = [
  "/dashboard",
  "/schedules",
  "/content",
  "/screens",
  "/alerts",
  "/audit-log",
  "/users",
  "/settings",
];

const ADMIN_API_PREFIXES = [
  "/api/schedules",
  "/api/content",
  "/api/screens",
  "/api/alerts",
  "/api/users",
  "/api/audit",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminPagePath(pathname: string) {
  return matchesPrefix(pathname, ADMIN_PAGE_PREFIXES);
}

export function isAdminApiPath(pathname: string) {
  return matchesPrefix(pathname, ADMIN_API_PREFIXES);
}
