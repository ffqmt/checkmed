import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "@/components/shared/notification-bell";
import type { NavArea } from "./nav-config";
import type { UserRole } from "@prisma/client";

export function AppShell({
  area,
  areaLabel,
  user,
  title,
  description,
  actions,
  children,
}: {
  area: NavArea;
  areaLabel: string;
  user: { id: string; name: string; email: string; role: UserRole };
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
            <ShieldCheck className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">MedCheck</p>
            <p className="text-[11px] text-sidebar-foreground/60">{areaLabel}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          <SidebarNav area={area} />
        </div>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/50">
            Governança e validação documental de atestados médicos.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileNav area={area} areaLabel={areaLabel} />
            <Link href="/" className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <span className="text-sm font-semibold">MedCheck</span>
            </Link>
          </div>
          <div className="hidden flex-col lg:flex">
            {title && <h1 className="text-base font-semibold leading-none">{title}</h1>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <NotificationBell userId={user.id} />
            <UserMenu name={user.name} email={user.email} role={user.role} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
