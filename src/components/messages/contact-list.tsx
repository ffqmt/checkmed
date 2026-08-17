import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatRelativeToNow } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MessageContact } from "@/server/actions/messages-inbox";

/** Server-rendered on purpose — selection state lives in the URL (`?contact=`), matching the Pagination/ViewToggle convention, so this list never needs to be a client component. */
export function ContactList({ contacts, selectedKey }: { contacts: MessageContact[]; selectedKey?: string }) {
  return (
    <div className="flex flex-col">
      {contacts.map((c) => {
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
