import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { authConfig } from "@/auth.config";
import { authenticateUser } from "@/lib/auth/credentials";
import { db } from "@/lib/db";
import {
  authAccounts,
  authAuthenticators,
  authSessions,
  authVerificationTokens,
  users,
} from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
    authenticatorsTable: authAuthenticators,
  }),
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" },
      },
      authorize(credentials, request) {
        return authenticateUser(credentials, request);
      },
    }),
  ],
});
