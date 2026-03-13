import type { NextAuthConfig } from "next-auth";
import { getAuthSecret, getSessionMaxAgeSeconds } from "@/lib/env";
import type { UserRole } from "@/lib/db/schema";

export const authConfig = {
  trustHost: true,
  secret: getAuthSecret(),
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: getSessionMaxAgeSeconds(),
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.username = user.username;
        token.mfaEnabled = user.mfaEnabled;
      }

      return token;
    },
    async session({ session, token }) {
      const sessionUser = (session.user ?? {
        name: token.name ?? "",
        email: token.email ?? "",
        image: "",
      }) as typeof session.user;

      sessionUser.id = token.sub ?? "";
      sessionUser.role = (token.role as UserRole | undefined) ?? "viewer";
      sessionUser.username =
        (token.username as string | undefined) ?? sessionUser.name ?? "";
      sessionUser.mfaEnabled = Boolean(token.mfaEnabled);
      session.user = sessionUser;

      return session;
    },
  },
} satisfies NextAuthConfig;
