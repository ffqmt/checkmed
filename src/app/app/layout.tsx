import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell area="client" areaLabel="Painel da empresa" user={session.user}>
      {children}
    </AppShell>
  );
}
