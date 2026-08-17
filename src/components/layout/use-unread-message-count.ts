"use client";

import * as React from "react";
import { getUnreadMessageCount } from "@/server/actions/messages-inbox";
import type { NavArea } from "./nav-config";

const POLL_INTERVAL_MS = 15000;

/** Only the internal team has a message inbox — client/admin areas never poll or show a badge. Separate cadence from the 5s in-thread poll since this runs on every page, not just while a chat is open. */
export function useUnreadMessageCount(area: NavArea): number {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (area !== "internal") return;
    let cancelled = false;

    async function poll() {
      try {
        const value = await getUnreadMessageCount();
        if (!cancelled) setCount(value);
      } catch {
        // Transient failures just wait for the next poll.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [area]);

  return count;
}
