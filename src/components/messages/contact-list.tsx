"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { initials, formatRelativeToNow } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MessageContact } from "@/server/actions/messages-inbox";

/**
 * Client component so search can filter instantly with no round-trip — the
 * full contact list is already fetched in one query and is small at today's
 * volume, so there's no reason to push filtering to the server (unlike
 * FilterBar's blur/Enter-commit pattern, which exists to avoid re-querying
 * a large table). Selection itself still lives in the URL (`?contact=`).
 */
export function ContactList({ contacts, selectedKey }: { contacts: MessageContact[]; selectedKey?: string }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    const digits = q.replace(/\D/g, "");
    return contacts.filter((c) => {
      if (c.label.toLowerCase().includes(q)) return true;
      if (c.context?.toLowerCase().includes(q)) return true;
      if (digits && c.canonicalKey.includes(digits)) return true;
      return false;
    });
  }, [contacts, query]);

  return (
    <div className="flex flex-col">
      <div className="border-b border-border/50 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contato..."
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum contato encontrado.</p>}
      {filtered.map((c) => {
        const active = c.canonicalKey === selectedKey;
        return (
          <Link
            key={c.canonicalKey}
            href={`/ops/messages?contact=${encodeURIComponent(c.canonicalKey)}`}
            aria-current={active}
            className={cn(
              "flex items-start gap-2.5 border-b border-border/50 px-3 py-3 text-left transition-colors hover:bg-muted/40",
              active && "bg-muted",
            )}
          >
            <Avatar>
              <AvatarFallback>{initials(c.label)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{c.label}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeToNow(c.previewAt)}</span>
              </div>
              {c.context && <p className="truncate text-xs text-muted-foreground">{c.context}</p>}
              {c.previewText && <p className="truncate text-xs text-muted-foreground">{c.previewText}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
