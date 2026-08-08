import type { NextAuthConfig } from "next-auth";
import { INTERNAL_ROLES } from "@/lib/constants";

/**
 * Edge-safe auth config used by middleware. Credentials provider and its
 * Prisma/bcrypt lookup live in auth.ts (Node runtime) — this file must stay
 * free of Node-only dependencies.
 */
export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // These run on every request (including in the edge proxy), so they must
    // stay free of Node-only APIs. Session strategy is JWT, so `session` here
    // just reshapes the already-decoded token — no DB access needed.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isAdminArea = pathname.startsWith("/admin");
      const isInternalArea = pathname.startsWith("/ops") || isAdminArea;
      const isClientArea = pathname.startsWith("/app");

      if (!isLoggedIn) {
        return isInternalArea || isClientArea ? false : true;
      }

      const role = auth.user.role;
      const isInternalUser = INTERNAL_ROLES.includes(role);
      const isAdminUser = role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN";

      if (isAdminArea && !isAdminUser) {
        return Response.redirect(new URL(isInternalUser ? "/ops" : "/app", request.nextUrl));
      }
      if (isInternalArea && !isInternalUser) {
        return Response.redirect(new URL("/app", request.nextUrl));
      }
      if (isClientArea && isInternalUser) {
        return Response.redirect(new URL("/ops", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
