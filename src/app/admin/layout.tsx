import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_ADMIN")) {
    redirect("/login");
  }

  return (
    <AppShell area="admin" areaLabel="Administração" user={session.user}>
      {children}
    </AppShell>
  );
}
