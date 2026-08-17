"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { NAV_BY_AREA, type NavArea } from "./nav-config";
import { useUnreadMessageCount } from "./use-unread-message-count";

export function MobileNav({ area, areaLabel }: { area: NavArea; areaLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const items = NAV_BY_AREA[area];
  const unreadCount = useUnreadMessageCount(area);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">{areaLabel}</p>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/app" && item.href !== "/ops" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badge = item.href === "/ops/messages" ? unreadCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted",
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
      </PopoverContent>
    </Popover>
  );
}
