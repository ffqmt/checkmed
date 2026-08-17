"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_BY_AREA, type NavArea } from "./nav-config";
import { useUnreadMessageCount } from "./use-unread-message-count";

export function SidebarNav({ area }: { area: NavArea }) {
  const pathname = usePathname();
  const items = NAV_BY_AREA[area];
  const unreadCount = useUnreadMessageCount(area);

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/app" && item.href !== "/ops" && pathname.startsWith(item.href));
        const Icon = item.icon;
        const badge = item.href === "/ops/messages" ? unreadCount : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
            )}
          >
            <Icon className="size-4" />
            {item.label}
            {badge > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-medium text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
