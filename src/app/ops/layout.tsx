import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { INTERNAL_ROLES } from "@/lib/constants";

export default async function OpsAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !INTERNAL_ROLES.includes(session.user.role)) redirect("/login");

  return (
    <AppShell area="internal" areaLabel="Operações" user={session.user}>
      {children}
    </AppShell>
  );
}
