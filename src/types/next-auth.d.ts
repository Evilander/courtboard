import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/db/schema";

declare module "next-auth" {
  interface User {
    id: string;
    role?: UserRole;
    username?: string;
    mfaEnabled?: boolean;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      username: string;
      mfaEnabled: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    username?: string;
    mfaEnabled?: boolean;
  }
}
