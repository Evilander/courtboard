import type { UserRole } from "@/lib/db/schema";

const ROLE_PRIORITY: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export function hasRequiredRole(currentRole: UserRole, requiredRole: UserRole) {
  return ROLE_PRIORITY[currentRole] >= ROLE_PRIORITY[requiredRole];
}
