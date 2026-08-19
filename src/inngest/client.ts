import { Inngest } from "inngest";

/**
 * Without INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY set, this still works
 * against the local Inngest Dev Server (`npx inngest-cli@latest dev`,
 * pointed at http://localhost:3000/api/inngest) — no account needed for
 * local development. Production delivery needs a real (free-tier) Inngest
 * account — see README "Fila real (Inngest)".
 */
export const inngest = new Inngest({ id: "medcheck" });
