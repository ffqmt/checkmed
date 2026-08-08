import type { UserRole } from "@prisma/client";

/**
 * next-auth / next-auth/jwt re-export their Session/User/JWT interfaces from
 * @auth/core (`export type { Session } from "@auth/core/types"`), so
 * declaration merging must target the module where the interface is
 * actually declared — augmenting "next-auth" directly is a no-op here.
 */
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      organizationId: string | null;
    };
  }

  interface User {
    role: UserRole;
    organizationId: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId: string | null;
  }
}
